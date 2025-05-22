import { encrypt } from 'eciesjs'

self.onmessage = async (e: MessageEvent) => {
  const { mode, chunks, filename, password, publicKey } = e.data

  try {
    if (mode !== 'encrypt') {
      throw new Error('Web Worker only supports encryption operations')
    }

    if (!publicKey) {
      throw new Error('ECIES public key not provided')
    }

    if (!password) {
      throw new Error('Please provide encryption password')
    }

    // Calculate SHA-256 hash of the password
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)
    const passwordHash = await crypto.subtle.digest('SHA-256', passwordData)
    const passwordHashArray = new Uint8Array(passwordHash)

    // Encrypt each chunk
    const encryptedChunks: Uint8Array[] = []
    for (const chunk of chunks) {
      const encrypted = encrypt(publicKey, Buffer.from(chunk))
      encryptedChunks.push(encrypted)
    }

    // Combine chunks with metadata
    const nameBuffer = new TextEncoder().encode(filename)
    const nameLength = nameBuffer.length
    if (nameLength > 255) {
      throw new Error('Filename too long, please rename and try again')
    }

    let totalLength = 1 + nameLength + 32 // nameLength byte + filename + 32 bytes for password hash
    encryptedChunks.forEach(chunk => totalLength += 4 + chunk.length) // 4 bytes for chunk length

    const resultArray = new Uint8Array(totalLength)
    let offset = 0

    resultArray.set([nameLength], offset)
    offset += 1
    resultArray.set(nameBuffer, offset)
    offset += nameLength
    resultArray.set(passwordHashArray, offset)
    offset += 32

    for (const chunk of encryptedChunks) {
      const chunkLength = chunk.length
      resultArray.set(new Uint8Array(new Uint32Array([chunkLength]).buffer), offset)
      offset += 4
      resultArray.set(chunk, offset)
      offset += chunk.length
    }

    self.postMessage({ data: { data: resultArray.buffer, filename: filename + '.encrypted' } })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'An error occurred' })
  }
}
