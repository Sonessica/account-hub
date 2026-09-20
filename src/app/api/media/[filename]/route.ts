import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** UUID (`%uuid%.webp`) or content-hash (`%32hex%.webp`) media filenames */
const MEDIA_FILENAME_RE = /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.webp$/i

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params
  if (!MEDIA_FILENAME_RE.test(filename)) {
    return new NextResponse('Not found', { status: 404 })
  }
  try {
    const file = await readFile(resolve(process.env.ATCHOOO_MEDIA_PATH || process.env.ACCOUNT_HUB_MEDIA_PATH || '/app/data/media', filename))
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
