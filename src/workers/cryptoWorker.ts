import { gcm } from '@noble/ciphers/aes.js'
import { randomBytes } from '@noble/ciphers/webcrypto.js'
import { argon2id } from '@noble/hashes/argon2.js'

import { getFileExtension, getFilenameWithoutExtension } from '@/lib/utils'

interface WorkerInput {
  mode: 'encrypt' | 'decrypt';
  chunks: ArrayBuffer[];
  password?: string;
  encryptionMode: 'password';
  filename: string;
  isTextMode: boolean;
}

const argonOpts = { t: 2, m: 10, p: 1, maxmem: 2 ** 32 - 1 }

// Web Worker for password-based encryption/decryption tasks
self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { mode, chunks, password, encryptionMode, filename, isTextMode } = e.data

  try {
    self.postMessage({ progress: 0, stage: 'Starting...' })

    if (encryptionMode !== 'password') {
      throw new Error('Unsupported encryption mode')
    }
    if (!password) {
      throw new Error('Password not provided')
    }

    if (mode === 'encrypt') {
      self.postMessage({ progress: 10, stage: 'Deriving key from password...' })
      const salt = randomBytes(16)
      const iv = randomBytes(12)
      const key = argon2id(password, salt, argonOpts)

      self.postMessage({ progress: 20, stage: 'Encrypting data...' })

      const encryptedChunks: Uint8Array[] = []
      const totalChunks = chunks.length

      for (let i = 0; i < chunks.length; i++) {
        const aes = gcm(key, iv)
        const ciphertext = aes.encrypt(new Uint8Array(chunks[i]))
        encryptedChunks.push(ciphertext)
        self.postMessage({ progress: 20 + ((i + 1) / totalChunks) * 60 })
      }

      self.postMessage({ progress: 80, stage: 'Preparing output...' })

      if (isTextMode) {
        if (encryptedChunks.length !== 1) throw new Error('Text mode expects exactly one chunk')
        const marker = new Uint8Array([0x02])
        const encryptedData = encryptedChunks[0]
        const resultArray = new Uint8Array(marker.length + salt.length + iv.length + encryptedData.length)
        resultArray.set(marker, 0)
        resultArray.set(salt, marker.length)
        resultArray.set(iv, marker.length + salt.length)
        resultArray.set(encryptedData, marker.length + salt.length + iv.length)
        self.postMessage({ progress: 100, stage: 'Complete!' })
        self.postMessage({ data: { data: resultArray.buffer, filename } })
      } else {
        const nameWithoutExt = getFilenameWithoutExtension(filename)
        const originalExtension = getFileExtension(filename)
        const nameBuffer = new TextEncoder().encode(nameWithoutExt)
        const extensionBuffer = new TextEncoder().encode(originalExtension)
        const nameLength = nameBuffer.length
        const extensionLength = extensionBuffer.length

        if (nameLength > 255) throw new Error('Filename too long, please rename and try again')
        if (extensionLength > 255) throw new Error('File extension too long')

        self.postMessage({ progress: 90, stage: 'Building encrypted file...' })

        const marker = new Uint8Array([0x02])
        let totalLength = 1 + 1 + nameLength + 1 + extensionLength + salt.length + iv.length
        encryptedChunks.forEach(chunk => totalLength += 4 + chunk.length)
        const resultArray = new Uint8Array(totalLength)
        let offset = 0

        resultArray.set(marker, offset)
        offset += 1
        resultArray.set([nameLength], offset)
        offset += 1
        resultArray.set(nameBuffer, offset)
        offset += nameLength
        resultArray.set([extensionLength], offset)
        offset += 1
        resultArray.set(extensionBuffer, offset)
        offset += extensionLength
        resultArray.set(salt, offset)
        offset += salt.length
        resultArray.set(iv, offset)
        offset += iv.length

        for (const chunk of encryptedChunks) {
          const chunkLength = chunk.length
          resultArray.set(new Uint8Array(new Uint32Array([chunkLength]).buffer), offset)
          offset += 4
          resultArray.set(chunk, offset)
          offset += chunk.length
        }

        self.postMessage({ progress: 100, stage: 'Complete!' })
        self.postMessage({ data: { data: resultArray.buffer, filename: filename + '.enc' } })
      }
    } else if (mode === 'decrypt') {
      self.postMessage({ progress: 10, stage: 'Preparing encrypted data...' })
      const totalLength = chunks.reduce((sum: number, chunk: ArrayBuffer) => sum + chunk.byteLength, 0)
      const combinedData = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        combinedData.set(new Uint8Array(chunk), offset)
        offset += chunk.byteLength
      }

      self.postMessage({ progress: 20, stage: 'Checking file format...' })
      if (combinedData.length < 1) throw new Error('Invalid file format: File too small')

      const decryptedChunks: Uint8Array[] = []
      let totalDecryptedLength = 0
      let originalExtension = 'txt'

      if (combinedData[0] !== 0x02) throw new Error('Invalid file format: Not a password-encrypted file')

      if (isTextMode) {
        self.postMessage({ progress: 30, stage: 'Extracting encryption parameters...' })
        const salt = combinedData.slice(1, 17)
        const iv = combinedData.slice(17, 29)
        const encryptedData = combinedData.slice(29)

        self.postMessage({ progress: 40, stage: 'Deriving key from password...' })
        const key = argon2id(password, salt, argonOpts)
        const aes = gcm(key, iv)

        self.postMessage({ progress: 60, stage: 'Decrypting data...' })
        try {
          const decrypted = aes.decrypt(encryptedData)
          decryptedChunks.push(decrypted)
          totalDecryptedLength += decrypted.length
          self.postMessage({ progress: 90, stage: 'Preparing decrypted text...' })
        } catch (err) {
          console.error('Decryption error:', err)
          throw new Error('Decryption failed: Invalid password or corrupted data')
        }
      } else {
        self.postMessage({ progress: 30, stage: 'Parsing file metadata...' })
        offset = 1

        if (combinedData.length < offset + 1) throw new Error('Invalid file format: File too small')
        const nameLength = combinedData[offset]
        if (nameLength > 255 || nameLength < 0) throw new Error('Invalid file format: Invalid name length')
        offset += 1
        if (offset + nameLength > combinedData.length) throw new Error('Invalid file format: Name length exceeds data')
        offset += nameLength

        if (offset + 1 > combinedData.length) throw new Error('Invalid file format: Missing extension length')
        const extensionLength = combinedData[offset]
        if (extensionLength > 255 || extensionLength < 0) throw new Error('Invalid file format: Invalid extension length')
        offset += 1
        if (offset + extensionLength > combinedData.length) throw new Error('Invalid file format: Extension length exceeds data')
        originalExtension = new TextDecoder().decode(combinedData.slice(offset, offset + extensionLength))
        offset += extensionLength

        const salt = combinedData.slice(offset, offset + 16)
        offset += 16
        const iv = combinedData.slice(offset, offset + 12)
        offset += 12

        self.postMessage({ progress: 40, stage: 'Deriving key from password...' })
        const key = argon2id(password, salt, argonOpts)

        self.postMessage({ progress: 50, stage: 'Extracting encrypted data...' })

        const encryptedChunks: Uint8Array[] = []
        while (offset < combinedData.length) {
          if (offset + 4 > combinedData.length) throw new Error('Invalid file format: Missing chunk length')
          const chunkLength = new Uint32Array(combinedData.slice(offset, offset + 4).buffer)[0]
          offset += 4
          if (offset + chunkLength > combinedData.length) throw new Error('Invalid file format: Chunk length exceeds data')
          const chunk = combinedData.slice(offset, offset + chunkLength)
          offset += chunkLength
          encryptedChunks.push(chunk)
        }

        if (encryptedChunks.length === 0) throw new Error('Invalid file format: No encrypted chunks found')

        self.postMessage({ progress: 60, stage: 'Decrypting data...' })

        const totalChunks = encryptedChunks.length
        for (let i = 0; i < encryptedChunks.length; i++) {
          try {
            const aes = gcm(key, iv)
            const decrypted = aes.decrypt(encryptedChunks[i])
            decryptedChunks.push(decrypted)
            totalDecryptedLength += decrypted.length
            self.postMessage({ progress: 60 + ((i + 1) / totalChunks) * 30 })
          } catch (err) {
            console.error('Decryption error:', err)
            throw new Error('Decryption failed: Invalid password or corrupted chunk')
          }
        }

        self.postMessage({ progress: 90, stage: 'Preparing decrypted file...' })
      }

      self.postMessage({ progress: 95, stage: 'Finalizing...' })
      const resultArray = new Uint8Array(totalDecryptedLength)
      let currentOffset = 0
      for (const chunk of decryptedChunks) {
        resultArray.set(chunk, currentOffset)
        currentOffset += chunk.length
      }

      self.postMessage({ progress: 100, stage: 'Complete!' })
      self.postMessage({ data: { data: resultArray.buffer, filename, originalExtension } })
    } else {
      throw new Error('Unsupported operation')
    }
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'An error occurred' })
  }
}
