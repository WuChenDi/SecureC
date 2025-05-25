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
