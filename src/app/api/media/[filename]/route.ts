import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Readable } from 'node:stream'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** UUID media files, plus legacy content-hash WebP files. */
const MEDIA_FILENAME_RE = /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(?:webp|mp4)$/i

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params
  if (!MEDIA_FILENAME_RE.test(filename)) {
    return new NextResponse('Not found', { status: 404 })
  }
  try {
    const path = resolve(process.env.ATCHOOO_MEDIA_PATH || process.env.ACCOUNT_HUB_MEDIA_PATH || '/app/data/media', filename)
    const info = await stat(path)
    const isVideo = filename.toLowerCase().endsWith('.mp4')
    const range = isVideo ? request.headers.get('range') : null
    let start = 0
    let end = info.size - 1
    let status = 200
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (!match) return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } })
      start = match[1] ? Number(match[1]) : 0
      end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) {
        return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } })
      }
      status = 206
    }
    const stream = createReadStream(path, { start, end })
    const length = end - start + 1
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status,
      headers: {
        'Content-Type': isVideo ? 'video/mp4' : 'image/webp',
        'Content-Length': String(length),
        ...(isVideo ? { 'Accept-Ranges': 'bytes' } : {}),
        ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {}),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
