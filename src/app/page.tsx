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
import { cn, genid } from '@/lib'
import { useProcessStore } from '@/store/useProcessStore'
import type { FileInfo, ProcessResult } from '@/types'
import { InputModeEnum, ModeEnum, StatusEnum } from '@/types'

export default function PasswordPage() {
  const [password, setPassword] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [textInput, setTextInput] = useState('')
  const [inputMode, setInputMode] = useState<keyof typeof InputModeEnum>(
    InputModeEnum.FILE,
  )
  const [activeTab, setActiveTab] = useState<keyof typeof ModeEnum>(
    ModeEnum.ENCRYPT,
  )

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

  useEffect(() => {
    return () => {
      const results = useProcessStore.getState().processResults
      results.forEach((result) => {
        if (result.downloadUrl) {
          URL.revokeObjectURL(result.downloadUrl)
        }
      })
    }
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

  const handleTabChange = (value: keyof typeof ModeEnum) => {
    setActiveTab(value)
    clearInput()
  }

  const processInput = async (mode: keyof typeof ModeEnum) => {
    if (inputMode === InputModeEnum.FILE && !selectedFile) {
      toast.error('Please select a file first')
      return
    }
    if (inputMode === InputModeEnum.MESSAGE && !textInput.trim()) {
      toast.error('Please input the message for processing')
      return
    }
    if (!password) {
      toast.error('Please enter a password')
      return
    }

    const taskId = String(genid.nextId())

    const initialResult: ProcessResult = {
      id: taskId,
      mode,
      inputMode,
      data: new ArrayBuffer(0),
      fileInfo: fileInfo || undefined,
      timestamp: Date.now(),
      status: StatusEnum.PROCESSING,
      progress: 0,
      stage: 'Initializing...',
    }

    addResult(initialResult)
    toast.info(
      `${mode === ModeEnum.ENCRYPT ? 'Encryption' : 'Decryption'} started`,
    )

    try {
      const worker = workerRef.current
      if (!worker) throw new Error('Web Worker not initialized')

      if (inputMode === InputModeEnum.FILE && selectedFile) {
        const result = await new Promise<{
          data: Blob
          filename: string
          base64?: string
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
            file: selectedFile,
            filename: selectedFile.name,
            password,
            isTextMode: false,
          })
        })

        const resultArrayBuffer = await result.data.arrayBuffer()

        const blob = new Blob([resultArrayBuffer], { type: result.data.type })
        const downloadUrl = URL.createObjectURL(blob)

        updateResult(taskId, {
          data: resultArrayBuffer,
          status: StatusEnum.COMPLETED,
          progress: 100,
          stage: 'Complete!',
          downloadUrl,
          fileInfo: {
            name: result.filename,
            size: result.data.size,
            type: result.data.type,
            originalExtension: result.originalExtension,
          },
        })

        toast.success(
          `File ${mode === ModeEnum.ENCRYPT ? 'encrypted' : 'decrypted'} successfully!`,
        )

        clearInput()
      } else if (inputMode === InputModeEnum.MESSAGE) {
        const result = await new Promise<{
          data: Blob
          filename: string
          base64: string
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
            text: textInput,
            password,
            isTextMode: true,
          })
        })

        const resultArrayBuffer = await result.data.arrayBuffer()

        updateResult(taskId, {
          data: resultArrayBuffer,
          text: result.base64,
          status: StatusEnum.COMPLETED,
          progress: 100,
          stage: 'Complete!',
        })

        toast.success(
          `Text ${mode === ModeEnum.ENCRYPT ? 'encrypted' : 'decrypted'} successfully! Check the history to view result.`,
        )

        clearInput()
      }
    } catch (error) {
      updateResult(taskId, {
        status: StatusEnum.FAILED,
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

  const isEncrypt = activeTab === ModeEnum.ENCRYPT

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

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              handleTabChange(value as keyof typeof ModeEnum)
            }
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger
                value={ModeEnum.ENCRYPT}
                className="flex items-center gap-2"
              >
                <Lock className="size-4" />
                Encrypt
              </TabsTrigger>
              <TabsTrigger
                value={ModeEnum.DECRYPT}
                className="flex items-center gap-2"
              >
                <Unlock className="size-4" />
                Decrypt
              </TabsTrigger>
            </TabsList>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Input Mode</Label>
                <div className="flex gap-2">
                  <Button
                    variant={
                      inputMode === InputModeEnum.FILE ? 'default' : 'outline'
                    }
                    onClick={() => setInputMode(InputModeEnum.FILE)}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Upload className="size-4" />
                    File
                  </Button>
                  <Button
                    variant={
                      inputMode === InputModeEnum.MESSAGE
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => setInputMode(InputModeEnum.MESSAGE)}
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
                {inputMode === InputModeEnum.FILE ? (
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
                      className="min-h-37 max-h-75 text-sm"
                    />
                  </>
                )}
              </div>

              <div className="flex">
                <Button
                  variant="default"
                  disabled={
                    (inputMode === InputModeEnum.FILE && !selectedFile) ||
                    (inputMode === InputModeEnum.MESSAGE &&
                      !textInput.trim()) ||
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
