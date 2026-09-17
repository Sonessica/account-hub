import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
const MAX_UPLOAD_BYTES = 20_000_000

function mediaDirectory() {
  return resolve(process.env.ACCOUNT_HUB_MEDIA_PATH || '/app/data/media')
}

// Public personal hub: image upload open like the rest of the editor APIs.
export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: '请选择图片文件' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: '图片不能超过 20 MB' }, { status: 413 })
  }

  try {
    const output = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'error' })
      .rotate()
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer()
    const filename = `${randomUUID()}.webp`
    await mkdir(mediaDirectory(), { recursive: true })
    await writeFile(resolve(mediaDirectory(), filename), output, { flag: 'wx' })
    return NextResponse.json({ url: `/api/media/${filename}`, bytes: output.byteLength })
  } catch {
    return NextResponse.json({ error: '图片无法处理' }, { status: 400 })
  }
}
