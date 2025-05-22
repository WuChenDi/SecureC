import { decrypt } from 'eciesjs'
import { NextRequest, NextResponse } from 'next/server'

// Helper function to compare Uint8Arrays
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as Blob
    const filename = formData.get('filename') as string
    const password = formData.get('password') as string

    if (!password) {
      return NextResponse.json({ error: 'Please provide decryption password' }, { status: 400 })
    }

    const privateKey = process.env.ECIES_PRIVATE_KEY
    // console.log('🚀 ~ POST ~ privateKey:', privateKey)
    if (!privateKey) {
      return NextResponse.json({ error: 'ECIES private key not configured' }, { status: 500 })
    }

    // Calculate SHA-256 hash of provided password
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)
    const providedPasswordHash = new Uint8Array(await crypto.subtle.digest('SHA-256', passwordData))

    const data = new Uint8Array(await file.arrayBuffer())
    let offset = 0

    const nameLength = data[offset]
    if (nameLength > 255) {
      return NextResponse.json({ error: 'Invalid file format' }, { status: 400 })
    }
    offset += 1

    const originalName = new TextDecoder().decode(data.slice(offset, offset + nameLength))
    offset += nameLength

    // Read stored password hash
    const storedPasswordHash = data.slice(offset, offset + 32)
    offset += 32

    // Verify password hash
    if (!arraysEqual(providedPasswordHash, storedPasswordHash)) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const decryptedChunks: Uint8Array[] = []
    let totalDecryptedLength = 0

    // Read chunks from concatenated data
    while (offset < data.length) {
      const chunkLength = new Uint32Array(data.slice(offset, offset + 4).buffer)[0]
      offset += 4
      const chunk = data.slice(offset, offset + chunkLength)
      offset += chunkLength

      const decrypted = decrypt(privateKey, chunk)
      decryptedChunks.push(decrypted)
      totalDecryptedLength += decrypted.length
    }

    // Combine decrypted chunks
    const resultArray = new Uint8Array(totalDecryptedLength)
    let currentOffset = 0
    for (const chunk of decryptedChunks) {
      resultArray.set(chunk, currentOffset)
      currentOffset += chunk.length
    }

    return NextResponse.json({
      data: Buffer.from(resultArray).toString('base64'),
      filename: originalName
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Decryption failed' },
      { status: 500 }
    )
  }
}

export const runtime = 'edge'
