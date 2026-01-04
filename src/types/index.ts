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
  fileInfo?: FileInfo
  text?: string
  timestamp: string | number
}
