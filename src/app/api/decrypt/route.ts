import { decrypt } from 'eciesjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as Blob
    const key = formData.get('key') as string
    const filename = formData.get('filename') as string

    if (!key) {
      return NextResponse.json({ error: 'Private key not provided' }, { status: 400 })
    }

    const data = new Uint8Array(await file.arrayBuffer())
    let offset = 0

    const nameLength = data[offset]
    if (nameLength > 255) {
      return NextResponse.json({ error: 'Invalid file format' }, { status: 400 })
    }
    offset += 1

    const originalName = new TextDecoder().decode(data.slice(offset, offset + nameLength))
    offset += nameLength

    const decryptedChunks: Uint8Array[] = []
    let totalDecryptedLength = 0

    // Read chunks from concatenated data
    while (offset < data.length) {
      const chunkLength = new Uint32Array(data.slice(offset, offset + 4).buffer)[0]
      offset += 4
      const chunk = data.slice(offset, offset + chunkLength)
      offset += chunkLength

      const decrypted = decrypt(key, chunk)
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
