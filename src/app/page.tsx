'use client'

import { FileText, Lock, Unlock, Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import FeaturesSection from '@/components/FeaturesSection'
import { FileInfoDisplay } from '@/components/FileInfoDisplay'
import { SCHeader, SCProcessingHistory } from '@/components/SC'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn, generateTimestamp, genid } from '@/lib'
import { useProcessStore } from '@/store/useProcessStore'
import type { FileInfo, ProcessResult } from '@/types'

export default function PasswordPage() {
  const [password, setPassword] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [textInput, setTextInput] = useState('')
  const [inputMode, setInputMode] = useState<'file' | 'message'>('file')
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt'>('encrypt')

  const addResult = useProcessStore((state) => state.addResult)
  const updateResult = useProcessStore((state) => state.updateResult)

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

    const taskId = String(genid.nextId())
    const timestamp = generateTimestamp()

    const initialResult: ProcessResult = {
      id: taskId,
      mode,
      inputMode,
      data: new ArrayBuffer(0),
      fileInfo: fileInfo || undefined,
      timestamp,
      status: 'processing',
      progress: 0,
      stage: 'Initializing...',
    }

    addResult(initialResult)
    toast.info(`${mode === 'encrypt' ? 'Encryption' : 'Decryption'} started`)

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
              updateResult(taskId, {
                progress,
                stage: stage || `Processing... ${progress}%`,
              })
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

        updateResult(taskId, {
          data: result.data,
          status: 'completed',
          progress: 100,
          stage: 'Complete!',
          fileInfo: {
            ...fileInfo!,
            originalExtension: result.originalExtension,
          },
        })

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
              updateResult(taskId, {
                progress,
                stage: stage || `Processing... ${progress}%`,
              })
            } else if (data) {
              resolve(data)
            }
          }
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

        updateResult(taskId, {
          data: result.data,
          text: resultText,
          status: 'completed',
          progress: 100,
          stage: 'Complete!',
        })

        toast.success(
          `Text ${mode === 'encrypt' ? 'encrypted' : 'decrypted'} successfully! Check the history to view result.`,
        )

        clearInput()
      }
    } catch (error) {
      updateResult(taskId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'An error occurred',
        progress: 0,
        stage: 'Failed',
      })

      toast.error(
        error instanceof Error
          ? error.message
          : 'An error occurred during processing',
      )
    }
  }

  const isEncrypt = activeTab === 'encrypt'

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <SCHeader />

        <div className="bg-card/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl mb-8 overflow-hidden p-6">
          <Input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          />

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="encrypt" className="flex items-center gap-2">
                <Lock className="size-4" />
                Encrypt
              </TabsTrigger>
              <TabsTrigger value="decrypt" className="flex items-center gap-2">
                <Unlock className="size-4" />
                Decrypt
              </TabsTrigger>
            </TabsList>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Input Mode</Label>
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
                <Label>Password</Label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>

              <div className="space-y-3">
                {inputMode === 'file' ? (
                  <>
                    <Label>Select File</Label>
                    <div
                      className={cn(
                        'group relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer',
                        fileInfo
                          ? isEncrypt
                            ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/30'
                            : 'border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/30'
                          : cn(
                              'border-gray-300 dark:border-gray-600',
                              isEncrypt
                                ? 'hover:border-blue-400 dark:hover:border-blue-500'
                                : 'hover:border-green-400 dark:hover:border-green-500',
                            ),
                      )}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center justify-center space-y-3 p-8">
                        <Upload
                          className={cn(
                            'size-12 transition-colors duration-300',
                            fileInfo
                              ? isEncrypt
                                ? 'text-blue-500'
                                : 'text-green-500'
                              : isEncrypt
                                ? 'text-gray-400 group-hover:text-blue-500'
                                : 'text-gray-400 group-hover:text-green-500',
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm text-center font-medium transition-colors duration-300',
                            fileInfo
                              ? isEncrypt
                                ? 'text-blue-600'
                                : 'text-green-600'
                              : isEncrypt
                                ? 'text-gray-500 group-hover:text-blue-600'
                                : 'text-gray-500 group-hover:text-green-600',
                          )}
                        >
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
                    <Label>Message</Label>
                    <Textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={
                        isEncrypt
                          ? 'Enter the message to be encrypted'
                          : 'Enter the message to be decrypted'
                      }
                      className="min-h-[148px] max-h-[300px] text-sm"
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
                    !password
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
        </div>

        <SCProcessingHistory />
        <FeaturesSection />
      </div>
    </div>
  )
}
