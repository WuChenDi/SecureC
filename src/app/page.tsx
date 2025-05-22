'use client'

import { Upload, Lock, Unlock, Info } from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Toaster, toast } from 'sonner'

import GradientText from '@/components/reactbits/GradientText'
import ShinyText from '@/components/reactbits/ShinyText'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FileInfo {
  name: string
  size: number
  type: string
}

export default function Home() {
  const [key, setKey] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/cryptoWorker.ts', import.meta.url))
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file)
    if (file) {
      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type || 'Unknown'
      })
    } else {
      setFileInfo(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const readFileChunk = (file: File, offset: number, chunkSize: number): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      const blob = file.slice(offset, offset + chunkSize)
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(blob)
    })
  }

  const downloadFile = (data: ArrayBuffer, filename: string) => {
    const blob = new Blob([data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const processFile = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    if (!key) {
      toast.error('Please enter the key.')
      return
    }

    const isEncryptedFile = selectedFile.name.endsWith('.encrypted')
    const mode = isEncryptedFile ? 'decrypt' : 'encrypt'

    setIsProcessing(true)

    try {
      const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
      const chunks: ArrayBuffer[] = []
      const fileSize = selectedFile.size
      let offset = 0

      // Split file into chunks
      while (offset < fileSize) {
        const chunk = await readFileChunk(selectedFile, offset, CHUNK_SIZE)
        chunks.push(chunk)
        offset += CHUNK_SIZE
      }

      let result: { data: ArrayBuffer; filename: string }

      if (mode === 'encrypt') {
        // Encrypt using Web Worker
        const worker = workerRef.current
        if (!worker) throw new Error('Web Worker not initialized')

        result = await new Promise<{ data: ArrayBuffer; filename: string }>((resolve, reject) => {
          worker.onmessage = (e: MessageEvent) => {
            const { data, error } = e.data
            if (error) {
              reject(new Error(error))
            } else {
              resolve(data)
            }
          }

          worker.postMessage({
            mode,
            chunks,
            filename: selectedFile.name,
            key
          })
        })
      } else {
        // Decrypt using server-side API
        const formData = new FormData()
        formData.append('file', new Blob(chunks))
        formData.append('filename', selectedFile.name)
        formData.append('key', key)

        const response = await fetch('/api/decrypt', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Decryption failed: ' + (await response.text()))
        }

        const data = await response.json()
        result = {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          data: Buffer.from(data.data, 'base64'),
          filename: data.filename
        }
      }

      downloadFile(result.data, result.filename)
      toast.success(`File ${mode === 'encrypt' ? 'encrypted' : 'decrypted'} successfully!`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
      setKey('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6">
      <Card className="w-full max-w-xl mx-auto border-none bg-card/20 backdrop-blur-lg p-4 sm:p-6 md:p-8 transition-all duration-300 rounded-2xl">
        <CardHeader className="text-center space-y-2 sm:space-y-3">
          <GradientText className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent flex items-center justify-center gap-2 sm:gap-3">
            SecureVault
          </GradientText>
          <ShinyText
            text="ECIES File Encryption Tool"
            disabled={false}
            speed={3}
            className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium"
          />
        </CardHeader>

        <CardContent className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
              Select File
            </Label>
            <div className="relative group">
              <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer',
                  fileInfo
                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                )}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 transition-transform duration-300 group-hover:scale-105">
                  <Upload className={`w-10 h-10 sm:w-12 sm:h-12 mb-3 ${fileInfo ? 'text-blue-500' : 'text-gray-400'} transition-colors duration-300`} />
                  <span className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 text-center font-medium">
                    {fileInfo ? `Selected: ${fileInfo.name}` : 'Click to select or drag and drop a file'}
                  </span>
                </div>
              </div>
            </div>
            {fileInfo && (
              <div className="rounded-xl bg-gray-50/50 dark:bg-gray-800/30 p-3 sm:p-4 text-xs sm:text-sm space-y-3 sm:space-y-4 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Filename</span>
                    <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{fileInfo.name}</p>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Size</span>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">{formatFileSize(fileInfo.size)}</p>
                  </div>
                  <div className="sm:col-span-2 space-y-1.5 sm:space-y-2">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Type</span>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">{fileInfo.type}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
              Key
            </Label>
            <Input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={
                selectedFile?.name.endsWith('.encrypted')
                  ? 'Enter private key for decryption'
                  : 'Enter public key for encryption'
              }
              className="font-mono text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              variant="default"
              size="lg"
              disabled={!selectedFile || !key || isProcessing}
              onClick={processFile}
              className={cn(
                'w-full sm:flex-1 text-white transition-all duration-300 shadow-lg disabled:shadow-none text-sm',
                selectedFile?.name.endsWith('.encrypted')
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-500/20 hover:shadow-green-500/30 sm:text-base'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-500/20 hover:shadow-blue-500/30'
              )}
            >
              {selectedFile?.name.endsWith('.encrypted') ? (
                <>
                  <Unlock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Decrypt
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Encrypt
                </>
              )}
            </Button>
          </div>

          {isProcessing && (
            <div className="space-y-3 sm:space-y-4 animate-fadeIn">
              <div className="text-center text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400">Processing...</div>
              <div className="h-1.5 sm:h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          <div className="rounded-xl bg-[#1a1f36] p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 shadow-lg">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              <span className="text-base sm:text-lg font-semibold text-white">Features</span>
            </div>
            <ul className="space-y-3 sm:space-y-4 text-sm sm:text-base">
              <li className="flex items-center gap-2.5 sm:gap-3">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400" />
                <span className="text-gray-300">Supports encryption/decryption of any file type</span>
              </li>
              <li className="flex items-center gap-2.5 sm:gap-3">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400" />
                <span className="text-gray-300">Uses ECIES with secp256k1 curve for asymmetric encryption</span>
              </li>
              <li className="flex items-center gap-2.5 sm:gap-3">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400" />
                <span className="text-gray-300">Processes large files in chunks for better efficiency</span>
              </li>
              <li className="flex items-center gap-2.5 sm:gap-3">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400" />
                <span className="text-gray-300">Automatic download of encrypted files</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
      <Toaster 
        richColors
        position="top-right"
        duration={3000}
      />
    </div>
  )
}
