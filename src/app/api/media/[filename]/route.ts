import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params
  if (!/^[0-9a-f-]{36}\.webp$/i.test(filename)) {
    return new NextResponse('Not found', { status: 404 })
  }
  try {
    const file = await readFile(resolve(process.env.ACCOUNT_HUB_MEDIA_PATH || '/app/data/media', filename))
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
