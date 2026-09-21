import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
const MAX_UPLOAD_BYTES = 20_000_000
const MAX_VIDEO_BYTES = 200_000_000

function mediaDirectory() {
  return resolve(process.env.ATCHOOO_MEDIA_PATH || process.env.ACCOUNT_HUB_MEDIA_PATH || '/app/data/media')
}

function runFfmpeg(args: string[]) {
  const executable = process.env.FFMPEG_PATH || 'ffmpeg'
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(executable, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => { stderr += String(chunk).slice(-4000) })
    child.once('error', reject)
    child.once('close', code => code === 0
      ? resolvePromise()
      : reject(new Error(stderr || `FFmpeg exited with ${code}`)))
  })
}

async function storePhoto(file: File, id: string) {
  const output = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'error' })
    .rotate()
    .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer()
  const filename = `${id}.webp`
  await writeFile(resolve(mediaDirectory(), filename), output, { flag: 'wx' })
  return { filename, bytes: output.byteLength }
}

async function storeVideo(file: File, id: string, createPoster: boolean) {
  const extension = extname(file.name).replace(/[^.a-z0-9]/gi, '') || '.video'
  const input = resolve(mediaDirectory(), `.${id}-input${extension}`)
  const videoFilename = `${id}.mp4`
  const videoOutput = resolve(mediaDirectory(), videoFilename)
  const frameOutput = resolve(mediaDirectory(), `.${id}-frame.png`)
  await writeFile(input, Buffer.from(await file.arrayBuffer()), { flag: 'wx' })
  try {
    // -2 keeps aspect ratio and forces even width/height (libx264 rejects odd dims).
    // Do not combine with force_original_aspect_ratio — it can emit odd heights (e.g. 1920x3413).
    const scale = "scale='min(1920,iw)':-2"
    try {
      await runFfmpeg([
        '-y', '-i', input,
        '-vf', scale,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', videoOutput,
      ])
    } catch {
      // Retry without audio (some live clips lack a usable audio stream / HE-AACv2 edge cases)
      await runFfmpeg([
        '-y', '-i', input,
        '-vf', scale,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
        '-an', '-movflags', '+faststart', videoOutput,
      ])
    }
    if (createPoster) {
      await runFfmpeg(['-y', '-ss', '0', '-i', input, '-frames:v', '1', frameOutput])
      const poster = await sharp(frameOutput)
        .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer()
      await writeFile(resolve(mediaDirectory(), `${id}.webp`), poster, { flag: 'wx' })
    }
    return videoFilename
  } catch (error) {
    await Promise.allSettled([
      unlink(videoOutput),
      unlink(resolve(mediaDirectory(), `${id}.webp`)),
    ])
    throw error
  } finally {
    await Promise.allSettled([unlink(input), unlink(frameOutput)])
  }
}

// Public personal hub: media upload open like the rest of the editor APIs.
export async function POST(request: Request) {
  const form = await request.formData()
  const photo = form.get('file')
  const video = form.get('video')
  const hasPhoto = photo instanceof File && photo.size > 0
  const hasVideo = video instanceof File && video.size > 0
  if (!hasPhoto && !hasVideo) {
    return NextResponse.json({ error: '请选择图片或视频文件' }, { status: 400 })
  }
  if (hasPhoto && !photo.type.startsWith('image/')) {
    return NextResponse.json({ error: '照片格式不受支持' }, { status: 400 })
  }
  if (hasVideo && !video.type.startsWith('video/') && !/\.mov$/i.test(video.name)) {
    return NextResponse.json({ error: '视频格式不受支持' }, { status: 400 })
  }
  if (hasPhoto && photo.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: '图片不能超过 20 MB' }, { status: 413 })
  }
  if (hasVideo && video.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: '视频不能超过 200 MB' }, { status: 413 })
  }

  const id = randomUUID()
  const created: string[] = []
  try {
    await mkdir(mediaDirectory(), { recursive: true })
    let bytes: number | undefined
    if (hasPhoto) {
      const stored = await storePhoto(photo, id)
      created.push(stored.filename)
      bytes = stored.bytes
    }
    if (hasVideo) {
      const filename = await storeVideo(video, id, !hasPhoto)
      created.push(filename)
      if (!hasPhoto) created.push(`${id}.webp`)
    }
    return NextResponse.json({
      type: hasPhoto && hasVideo ? 'live-photo' : hasVideo ? 'video' : 'image',
      url: `/api/media/${id}.webp`,
      ...(hasVideo ? { videoUrl: `/api/media/${id}.mp4` } : {}),
      ...(bytes ? { bytes } : {}),
    })
  } catch (error) {
    console.error('Media processing failed', error)
    await Promise.allSettled(created.map(filename => unlink(resolve(mediaDirectory(), filename))))
    return NextResponse.json({ error: '媒体无法处理，请检查文件格式' }, { status: 400 })
  }
}
