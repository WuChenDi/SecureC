export interface FileInfo {
  name: string
  size: number
  type: string
  originalExtension?: string
}

export interface KeyPair {
  publicKey: string
  privateKey: string
}

export interface ProcessResult {
  id: string
  mode: 'encrypt' | 'decrypt'
  inputMode: 'file' | 'message'
  data: ArrayBuffer
  text?: string
  fileInfo?: FileInfo
  timestamp: number
  status: 'processing' | 'completed' | 'failed'
  progress: number
  stage: string
  error?: string
  downloadUrl?: string
}
