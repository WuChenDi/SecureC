'use client'

import { FileText, Lock, Unlock, Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import FeaturesSection from '@/components/FeaturesSection'
import { FileInfoDisplay } from '@/components/FileInfoDisplay'
import ProgressIndicator from '@/components/ProgressIndicator'
import { SCHeader, SCProcessingHistory, SCResultDialog } from '@/components/SC'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { genid } from '@/lib'
import {
  cn,
  downloadFile,
  generateTimestamp,
  getFilenameWithoutExtension,
} from '@/lib/utils'
import { useProcessStore } from '@/store/useProcessStore'
import type { FileInfo, ProcessResult } from '@/types'

export default function PasswordPage() {
  const [password, setPassword] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [textInput, setTextInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [inputMode, setInputMode] = useState<'file' | 'message'>('file')

  const addResult = useProcessStore((state) => state.addResult)
  const clearResults = useProcessStore((state) => state.clearResults)

  const [currentResult, setCurrentResult] = useState<ProcessResult | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStage, setProcessingStage] = useState('')
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt'>('encrypt')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/cryptoWorker.ts', import.meta.url),
    )
    return () => workerRef.current?.terminate()
  }, [])

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file)
    if (file) {
      setFileInfo({
        name: file.name,
        size: file.size,
        type:
          file.type ||
          (file.name.endsWith('.enc') ? 'application/encrypted' : 'Unknown'),
      })
    } else {
      setFileInfo(null)
    }
  }, [])

  const clearInput = () => {
    setSelectedFile(null)
    setFileInfo(null)
    setTextInput('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const resetAll = () => {
    setPassword('')
    setSelectedFile(null)
    setFileInfo(null)
    setTextInput('')
    clearResults()
    setCurrentResult(null)
    setIsDialogOpen(false)
    setIsProcessing(false)
    setProcessingProgress(0)
    setProcessingStage('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'encrypt' | 'decrypt')
    clearInput()
  }

  const readFileChunk = (
    file: File,
    offset: number,
    chunkSize: number,
  ): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      const blob = file.slice(offset, offset + chunkSize)
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(blob)
    })
  }

  const processInput = async (mode: 'encrypt' | 'decrypt') => {
    if (inputMode === 'file' && !selectedFile) {
      toast.error('Please select a file first')
      return
    }
    if (inputMode === 'message' && !textInput.trim()) {
      toast.error('Please input the message for processing')
      return
    }
    if (!password) {
      toast.error('Please enter a password')
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)
    setProcessingStage('Initializing...')

    try {
      const worker = workerRef.current
      if (!worker) throw new Error('Web Worker not initialized')

      if (inputMode === 'file' && selectedFile) {
        const CHUNK_SIZE = 5 * 1024 * 1024
        const chunks: ArrayBuffer[] = []
        const fileSize = selectedFile.size
        let offset = 0
        while (offset < fileSize) {
          const chunk = await readFileChunk(selectedFile, offset, CHUNK_SIZE)
          chunks.push(chunk)
          offset += CHUNK_SIZE
        }
        if (fileSize > 50 * 1024 * 1024) {
          toast.warning(
            'Large file detected. Processing may be slow on client-side.',
          )
        }

        const result = await new Promise<{
          data: ArrayBuffer
          filename: string
          originalExtension?: string
        }>((resolve, reject) => {
          worker.onmessage = (e: MessageEvent) => {
            const { data, error, progress, stage } = e.data
            if (error) {
              reject(new Error(error))
            } else if (progress !== undefined) {
              setProcessingProgress(progress)
              if (stage) {
                setProcessingStage(stage)
              }
            } else if (data) {
              resolve(data)
            }
          }
          worker.postMessage({
            mode,
            chunks,
            filename: selectedFile.name,
            password,
            encryptionMode: 'password',
            isTextMode: false,
          })
        })

        const newResult: ProcessResult = {
          id: String(genid.nextId()),
          mode,
          inputMode: 'file',
          data: result.data,
          fileInfo: {
            ...fileInfo!,
            originalExtension: result.originalExtension,
          },
          timestamp: generateTimestamp(),
        }

        addResult(newResult)
        setCurrentResult(newResult)

        toast.success(
          `File ${mode === 'encrypt' ? 'encrypted' : 'decrypted'} successfully!`,
        )

        clearInput()
      } else if (inputMode === 'message') {
        let chunks: ArrayBuffer[] = []
        if (mode === 'encrypt') {
          const textBuffer = new TextEncoder().encode(textInput)
          chunks = [textBuffer.buffer]
        } else {
          try {
            const decodedText = Buffer.from(textInput.trim(), 'base64')
            chunks = [decodedText.buffer]
          } catch (error) {
            console.error('Invalid Base64 input for decryption:', error)
            throw new Error('Invalid Base64 input for decryption')
          }
        }

        const result = await new Promise<{
          data: ArrayBuffer
          filename: string
          originalExtension?: string
        }>((resolve, reject) => {
          worker.onmessage = (e: MessageEvent) => {
            const { data, error, progress, stage } = e.data
            if (error) {
              reject(new Error(error))
            } else if (progress !== undefined) {
              setProcessingProgress(progress)
              if (stage) {
                setProcessingStage(stage)
              }
            } else if (data) {
              resolve(data)
            }
          }
          const timestamp = generateTimestamp()
          const filename =
            mode === 'encrypt'
              ? `encrypted_text_${timestamp}.enc`
              : `${timestamp}.txt`
          worker.postMessage({
            mode,
            chunks,
            filename,
            password,
            encryptionMode: 'password',
            isTextMode: true,
          })
        })

        let resultText = ''
        if (mode === 'encrypt') {
          resultText = Buffer.from(result.data).toString('base64')
        } else {
          resultText = new TextDecoder().decode(result.data)
        }

        const newResult: ProcessResult = {
          id: String(genid.nextId()),
          mode,
          inputMode: 'message',
          data: result.data,
          text: resultText,
          timestamp: generateTimestamp(),
        }

        addResult(newResult)
        setCurrentResult(newResult)
        setIsDialogOpen(true)

        toast.success(
          `Text ${mode === 'encrypt' ? 'encrypted' : 'decrypted'} successfully!`,
        )

        clearInput()
      }

      setTimeout(() => {
        setProcessingProgress(0)
        setProcessingStage('')
      }, 1000)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'An error occurred during processing',
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadResult = (result: ProcessResult) => {
    if (result.inputMode === 'message') {
      const filename =
        result.mode === 'encrypt'
          ? `encrypted_text_${result.timestamp}.enc`
          : `${result.timestamp}.txt`
      downloadFile(result.data, filename)
    } else if (result.fileInfo) {
      if (result.mode === 'encrypt') {
        const nameWithoutExt = getFilenameWithoutExtension(result.fileInfo.name)
        downloadFile(result.data, `${nameWithoutExt}_${result.timestamp}.enc`)
      } else {
        const extension = result.fileInfo.originalExtension || 'bin'
        downloadFile(result.data, `${result.timestamp}.${extension}`)
      }
    }
    toast.success('File downloaded successfully')
  }

  const handleViewResult = (result: ProcessResult) => {
    setCurrentResult(result)
    setIsDialogOpen(true)
  }

  const isEncrypt = activeTab === 'encrypt'
  const borderColor = isEncrypt
    ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/30'
    : 'border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/30'
  const hoverColor = isEncrypt
    ? 'hover:border-blue-400 dark:hover:border-blue-500'
    : 'hover:border-green-400 dark:hover:border-green-500'
  const iconColor = isEncrypt ? 'text-blue-500' : 'text-green-500'

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <SCHeader />

        <div className="bg-card/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl mb-8 overflow-hidden">
          <div className="p-6 md:p-8">
            <Input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger
                  value="encrypt"
                  className="flex items-center gap-2"
                >
                  <Lock className="size-4" />
                  Encrypt
                </TabsTrigger>
                <TabsTrigger
                  value="decrypt"
                  className="flex items-center gap-2"
                >
                  <Unlock className="size-4" />
                  Decrypt
                </TabsTrigger>
              </TabsList>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Input Mode
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant={inputMode === 'file' ? 'default' : 'outline'}
                      onClick={() => setInputMode('file')}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Upload className="size-4" />
                      File
                    </Button>
                    <Button
                      variant={inputMode === 'message' ? 'default' : 'outline'}
                      onClick={() => setInputMode('message')}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <FileText className="size-4" />
                      Messages
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Password
                  </Label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="font-mono text-sm h-11"
                  />
                </div>

                <div className="space-y-3">
                  {inputMode === 'file' ? (
                    <>
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Select File
                      </Label>
                      <div
                        className={cn(
                          'relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer',
                          fileInfo
                            ? borderColor
                            : `border-gray-300 dark:border-gray-600 ${hoverColor}`,
                        )}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center justify-center p-8">
                          <Upload
                            className={cn(
                              'w-12 h-12 mb-3',
                              fileInfo ? iconColor : 'text-gray-400',
                            )}
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">
                            {fileInfo
                              ? `Selected: ${fileInfo.name}`
                              : 'Click to select a file'}
                          </span>
                        </div>
                      </div>
                      {fileInfo && <FileInfoDisplay fileInfo={fileInfo} />}
                    </>
                  ) : (
                    <>
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Message
                      </Label>
                      <Textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={
                          isEncrypt
                            ? 'Enter the message to be encrypted'
                            : 'Enter the message to be decrypted'
                        }
                        className="min-h-[100px] max-h-[300px] font-mono text-sm"
                      />
                    </>
                  )}
                </div>

                <div className="flex">
                  <Button
                    variant="default"
                    disabled={
                      (inputMode === 'file' && !selectedFile) ||
                      (inputMode === 'message' && !textInput.trim()) ||
                      !password ||
                      isProcessing
                    }
                    onClick={() => processInput(activeTab)}
                    className={cn(
                      'flex-1',
                      isEncrypt
                        ? 'bg-primary hover:bg-primary/90'
                        : 'bg-green-600 hover:bg-green-700',
                    )}
                  >
                    {isEncrypt ? (
                      <Lock className="size-4" />
                    ) : (
                      <Unlock className="size-4" />
                    )}
                    {isEncrypt ? 'Encrypt' : 'Decrypt'}
                  </Button>
                </div>
              </div>
            </Tabs>

            <ProgressIndicator
              isProcessing={isProcessing}
              processingStage={processingStage}
              processingProgress={processingProgress}
            />
          </div>
        </div>

        <FeaturesSection className="mb-8" />
        <SCProcessingHistory onViewResult={handleViewResult} />
      </div>

      <SCResultDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        result={currentResult}
        onDownload={downloadResult}
      />
    </div>
  )
}
