'use client'

import { Upload, Lock, Unlock, Info, Sparkles } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FileInfo {
  name: string
  size: number
  type: string
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [password, setPassword] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const processFile = async (mode: 'encrypt' | 'decrypt') => {
    if (!selectedFile || !password) {
      setError('Please select a file and enter a password')
      return
    }

    setIsProcessing(true)
    setError('')
    setSuccess('')

    try {
      const result = mode === 'encrypt'
        ? await encryptFile(selectedFile, password)
        : await decryptFile(selectedFile, password)

      downloadFile(result.data, result.filename)
      setSuccess(`File ${mode}ed successfully!`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const encryptFile = async (file: File, password: string) => {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveKey(password, salt)
    const fileData = await readFileAsArrayBuffer(file)
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileData
    )

    const originalName = new TextEncoder().encode(file.name)
    const nameLength = originalName.length

    if (nameLength > 255) {
      throw new Error('Filename too long, please rename and try again')
    }

    const result = new Uint8Array(
      salt.length + iv.length + 1 + nameLength + encryptedData.byteLength
    )

    let offset = 0
    result.set(salt, offset)
    offset += salt.length
    result.set(iv, offset)
    offset += iv.length
    result.set([nameLength], offset)
    offset += 1
    result.set(originalName, offset)
    offset += originalName.length
    result.set(new Uint8Array(encryptedData), offset)

    return {
      data: result,
      filename: file.name + '.encrypted'
    }
  }

  const decryptFile = async (file: File, password: string) => {
    const fileData = await readFileAsArrayBuffer(file)
    const data = new Uint8Array(fileData)

    if (data.length < 29) {
      throw new Error('Invalid file format or corrupted file')
    }

    try {
      let offset = 0
      const salt = data.slice(offset, offset + 16)
      offset += 16
      const iv = data.slice(offset, offset + 12)
      offset += 12
      const nameLength = data[offset]
      offset += 1

      if (nameLength > 255 || offset + nameLength > data.length) {
        throw new Error('Invalid file format')
      }

      const originalName = new TextDecoder().decode(
        data.slice(offset, offset + nameLength)
      )
      offset += nameLength
      const encryptedData = data.slice(offset)

      const key = await deriveKey(password, salt)
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
      )

      return {
        data: decryptedData,
        filename: originalName
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'OperationError') {
        throw new Error('Decryption failed, please check your password')
      }
      throw error
    }
  }

  const deriveKey = async (password: string, salt: Uint8Array) => {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(new Error('File reading failed'))
      reader.readAsArrayBuffer(file)
    })
  }

  const downloadFile = (data: ArrayBuffer | Uint8Array, filename: string) => {
    let blobData: ArrayBuffer
    if (data instanceof ArrayBuffer) {
      blobData = data
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      blobData = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
    }

    const blob = new Blob([blobData])
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-2 sm:p-5 transition-colors duration-500">
      <Card className="w-full max-w-lg mx-auto backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-white/20 shadow-2xl shadow-blue-500/10 p-4 sm:p-8 transition-all duration-300 hover:shadow-blue-500/20">
        {/* Header */}
        <CardHeader className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-600" /> SecureVault
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">AES File Encryption Tool</p>
        </CardHeader>

        <CardContent className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          {/* File Upload Section */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm sm:text-base font-medium">
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
                className={`relative overflow-hidden rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 transition-all duration-300 ${fileInfo ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 transition-transform duration-300 group-hover:scale-105">
                  <Upload className={`w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 ${fileInfo ? 'text-blue-500' : 'text-gray-400'} transition-colors duration-300`} />
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">
                    {fileInfo ? `Selected: ${fileInfo.name}` : 'Click to select file or drag and drop'}
                  </span>
                </div>
              </div>
            </div>
            {fileInfo && (
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 text-xs sm:text-sm space-y-2 animate-fadeIn">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <span className="text-gray-500 dark:text-gray-400">Name</span>
                    <p className="font-medium truncate">{fileInfo.name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-500 dark:text-gray-400">Size</span>
                    <p className="font-medium">{formatFileSize(fileInfo.size)}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <span className="text-gray-500 dark:text-gray-400">Type</span>
                    <p className="font-medium">{fileInfo.type}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Password Section */}
          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="password" className="text-sm sm:text-base font-medium">
              Password
            </Label>
            <Input
              type="password"
              id="password"
              placeholder="Enter encryption password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              variant="default"
              size="lg"
              disabled={!selectedFile || !password}
              onClick={() => processFile('encrypt')}
              className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:shadow-none text-sm sm:text-base"
            >
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Encrypt
            </Button>
            <Button
              variant="secondary"
              size="lg"
              disabled={!selectedFile || !password}
              onClick={() => processFile('decrypt')}
              className="w-full sm:flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white transition-all duration-300 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 disabled:shadow-none text-sm sm:text-base"
            >
              <Unlock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Decrypt
            </Button>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2 sm:space-y-3 animate-fadeIn">
              <div className="text-center text-sm sm:text-base font-medium text-blue-600 dark:text-blue-400">Processing...</div>
              <div className="h-1.5 sm:h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="p-3 sm:p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs sm:text-sm animate-slideIn">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 sm:p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs sm:text-sm animate-slideIn">
              {success}
            </div>
          )}

          {/* Info Panel */}
          <div className="rounded-xl bg-[#1a1f36] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#2b3245]">
                <Info className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-base font-medium text-white">Features</span>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-gray-300">Supports any file type encryption/decryption</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-gray-300">Uses AES-256-GCM algorithm for security</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-gray-300">Encrypted files download automatically</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-gray-300">Keep your password safe - lost passwords cannot be recovered</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
