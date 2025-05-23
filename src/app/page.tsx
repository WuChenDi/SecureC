'use client'

import { base58 } from '@scure/base'
import { HDKey } from '@scure/bip32'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { Upload, Lock, Unlock, Info } from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Toaster, toast } from 'sonner'

import GradientText from '@/components/reactbits/GradientText'
import ShinyText from '@/components/reactbits/ShinyText'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, validateBase58PublicKey } from '@/lib/utils'

// eslint-disable-next-line quotes
const DEFAULT_DERIVATION_PATH = "m/44'/0'/0'/0/0"

interface FileInfo {
  name: string
  size: number
  type: string
}

interface KeyPair {
  publicKey: string
  privateKey: string
}

export default function Home() {
  const [keyInput, setKeyInput] = useState('')
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

  const deriveKeyPair = (mnemonic: string): KeyPair => {
    if (!bip39.validateMnemonic(mnemonic, wordlist)) {
      throw new Error('Invalid mnemonic phrase')
    }

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const masterNode = HDKey.fromMasterSeed(seed)
    const key = masterNode.derive(DEFAULT_DERIVATION_PATH)

    if (!key.privateKey || !key.publicKey) {
      throw new Error('Failed to derive key pair')
    }

    return {
      privateKey: Buffer.from(key.privateKey).toString('hex'),
      publicKey: base58.encode(key.publicKey) // Base58 encoded public key
    }
  }

  const isBase58String = (input: string): boolean => {
    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(input) // Base58 character set
  }

  const isHexString = (input: string): boolean => {
    return /^[0-9a-fA-F]+$/.test(input)
  }

  const isMnemonicPhrase = (input: string): boolean => {
    return input.split(' ').length >= 12
  }

  const processFile = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    if (!keyInput) {
      toast.error(selectedFile.name.endsWith('.enc') ? 'Please enter a private key or mnemonic phrase' : 'Please enter a public key')
      return
    }

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

      // Warn for large files
      if (fileSize > 50 * 1024 * 1024) {
        toast.warning('Large file detected. Processing may be slow on client-side.')
      }

      let publicKey: string | undefined
      let privateKey: string | undefined
      const mode = selectedFile.name.endsWith('.enc') ? 'decrypt' : 'encrypt'

      if (mode === 'encrypt') {
        if (isBase58String(keyInput)) {
          const validation = validateBase58PublicKey(keyInput)
          if (!validation.isValid) {
            throw new Error(validation.error)
          }
          publicKey = keyInput // 传递 Base58 字符串给 worker
        } else {
          throw new Error('Invalid input. Please enter a valid Base58 public key')
        }
      } else {
        if (isHexString(keyInput)) {
          if (keyInput.length === 64) {
            privateKey = keyInput
          } else {
            throw new Error('Invalid private key length. Must be 32 bytes (64 hex characters)')
          }
        } else if (isMnemonicPhrase(keyInput)) {
          const derivedKeys = deriveKeyPair(keyInput)
          privateKey = derivedKeys.privateKey
        } else {
          throw new Error('Invalid input. Please enter a valid private key (64 hex characters) or mnemonic phrase')
        }
      }

      const worker = workerRef.current
      if (!worker) throw new Error('Web Worker not initialized')

      const result = await new Promise<{ data: ArrayBuffer; filename: string }>((resolve, reject) => {
        worker.onmessage = (e: MessageEvent) => {
          const { data, error } = e.data
          if (error) reject(new Error(error))
          else resolve(data)
        }
        worker.postMessage({
          mode,
          chunks,
          filename: selectedFile.name,
          publicKey,
          privateKey
        })
      })

      downloadFile(result.data, result.filename)
      toast.success(`File ${mode === 'encrypt' ? 'encrypted' : 'decrypted'} successfully!`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred during processing')
    } finally {
      setIsProcessing(false)
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

        <CardContent className="space-y-6 sm:space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                {selectedFile?.name.endsWith('.enc') ? 'Private Key or Mnemonic' : 'Public Key'}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={
                    selectedFile?.name.endsWith('.enc')
                      ? 'Enter private key (64 hex) or mnemonic phrase'
                      : 'Enter Base58 public key (approx. 44-45 characters)'
                  }
                  className="font-mono text-sm h-[40px] flex-1"
                />
              </div>
            </div>
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
                      ? selectedFile?.name.endsWith('.enc')
                        ? 'border-green-400 dark:border-green-500 bg-green-50/30 dark:bg-green-900/20'
                        : 'border-blue-400 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center p-6 sm:p-8 transition-transform duration-300 group-hover:scale-105">
                    <Upload
                      className={cn(
                        'w-10 h-10 sm:w-12 sm:h-12 mb-3',
                        fileInfo
                          ? selectedFile?.name.endsWith('.enc')
                            ? 'text-green-500'
                            : 'text-blue-500'
                          : 'text-gray-400'
                      )}
                    />
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
            <Button
              variant="default"
              size="lg"
              disabled={!selectedFile || !keyInput || isProcessing}
              onClick={processFile}
              className={cn(
                'w-full text-white transition-all duration-300 shadow-lg disabled:shadow-none',
                selectedFile?.name.endsWith('.enc')
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-500/20 hover:shadow-green-500/30'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-500/20 hover:shadow-blue-500/30'
              )}
            >
              {selectedFile?.name.endsWith('.enc') ? (
                <>
                  <Unlock className="w-5 h-5 mr-2" />
                  Decrypt
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Encrypt
                </>
              )}
            </Button>
          </div>

          {isProcessing && (
            <div className="space-y-3 sm:space-y-4 animate-fadeIn">
              <div className="text-center text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400">
                Processing...
              </div>
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
                <span className="text-gray-300">Automatic download of encrypted/decrypted files</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
      <Toaster richColors position="top-right" duration={3000} />
    </div>
  )
}
