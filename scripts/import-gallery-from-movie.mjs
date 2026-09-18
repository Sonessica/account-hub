/**
 * Import gallery image widgets from NAS movie downloads.
 * Run inside the account-hub image with host paths mounted.
 *
 * Expected env/args:
 *   MOVIE_DIR  e.g. /movie/罗怡恬er/downloads
 *   MEDIA_DIR  e.g. /app/data/media
 *   DB_PATH    e.g. /app/data/account-hub.sqlite
 */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import sharp from 'sharp'

const MOVIE_DIR = process.env.MOVIE_DIR || '/movie/罗怡恬er/downloads'
const MEDIA_DIR = process.env.MEDIA_DIR || '/app/data/media'
const DB_PATH = process.env.DB_PATH || '/app/data/account-hub.sqlite'
const GROUP = 9
const MAX_UPLOAD_BYTES = 20_000_000

function newId(prefix) {
  return `${prefix}-${randomUUID()}`
}

function parseFolderTitle(name) {
  const idx = name.indexOf('_')
  if (idx <= 0) return name
  return name.slice(idx + 1).trim() || name
}

async function listSourceImages() {
  const entries = await readdir(MOVIE_DIR, { withFileTypes: true })
  const folders = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort()

  const items = []
  for (const folder of folders) {
    const dir = join(MOVIE_DIR, folder)
    let files
    try {
      files = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    const images = files
      .filter((f) => f.isFile() && /\.(webp|jpe?g|png|gif|bmp)$/i.test(f.name))
      .map((f) => f.name)
      .sort()
    if (!images.length) continue
    const title = parseFolderTitle(folder)
    for (const file of images) {
      items.push({ path: join(dir, file), title, folder })
    }
  }
  return items
}

async function importOne(srcPath) {
  const buf = await readFile(srcPath)
  if (buf.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(`file too large: ${srcPath}`)
  }
  const output = await sharp(buf, { failOn: 'error' })
    .rotate()
    .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer()
  const filename = `${createHash('sha1').update(buf).digest('hex').slice(0, 32)}.webp`
  const dest = join(MEDIA_DIR, filename)
  await mkdir(MEDIA_DIR, { recursive: true })
  // overwrite-safe write; same content maps to same name
  const { writeFile } = await import('node:fs/promises')
  await writeFile(dest, output, { flag: 'w' })
  return `/api/media/${filename}`
}

function placeGalleries(count) {
  // 2x2 cards in rows of 3, starting below the search pill (row 0)
  const positions = []
  const perRow = 3
  const gap = 1
  const step = 2 + gap
  const startY = 2
  const startX = 0
  for (let i = 0; i < count; i++) {
    const col = i % perRow
    const row = Math.floor(i / perRow)
    positions.push({ x: startX + col * step, y: startY + row * step })
  }
  return positions
}

async function main() {
  console.log('scan', MOVIE_DIR)
  const items = await listSourceImages()
  console.log('source images', items.length)
  if (!items.length) throw new Error('no source images found')

  const groups = []
  for (let i = 0; i < items.length; i += GROUP) {
    groups.push(items.slice(i, i + GROUP))
  }
  console.log('gallery groups', groups.length)

  await mkdir(MEDIA_DIR, { recursive: true })
  const mediaUrls = []
  let ok = 0
  let failed = 0
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    try {
      const url = await importOne(item.path)
      mediaUrls.push({ url, title: item.title })
      ok++
    } catch (err) {
      console.error('import fail', item.path, err.message)
      mediaUrls.push(null)
      failed++
    }
    if ((i + 1) % 50 === 0) console.log(`processed ${i + 1}/${items.length}`)
  }
  console.log('imported ok', ok, 'failed', failed)

  const db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA busy_timeout = 10000')
  db.exec('BEGIN IMMEDIATE')
  try {
    const row = db.prepare('SELECT revision, snapshot FROM editor_state WHERE id = 1').get()
    if (!row) throw new Error('editor_state missing')
    const snap = JSON.parse(row.snapshot)
    const oldWidgets = Array.isArray(snap.widgets) ? snap.widgets : []
    const nonImages = oldWidgets.filter((w) => w && w.category !== 'image')
    const removedImages = oldWidgets.length - nonImages.length

    const positions = placeGalleries(groups.length)
    const galleryWidgets = []
    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi]
      const images = []
      for (let k = 0; k < group.length; k++) {
        const meta = mediaUrls[gi * GROUP + k]
        if (!meta) continue
        images.push({
          id: newId('img'),
          src: meta.url,
          alt: meta.title,
        })
      }
      if (!images.length) continue
      const title = group[0].title
      const pos = positions[galleryWidgets.length] || { x: 0, y: 2 }
      galleryWidgets.push({
        id: newId('image-gallery'),
        category: 'image',
        size: '2x2',
        x: pos.x,
        y: pos.y,
        src: images[0].src,
        images,
        coverMode: images.length > 1 ? 'random' : 'fixed',
        coverId: images[0].id,
        coverIntervalMs: 15000,
        coverEffect: 'crossfade',
        objectFit: 'cover',
        title: title.length > 40 ? `${title.slice(0, 38)}…` : title,
      })
    }

    const nextWidgets = [...nonImages, ...galleryWidgets]
    const nextSnap = {
      ...snap,
      widgets: nextWidgets,
      profile: snap.profile || { name: 'ATCHOOO', description: '' },
      ...(snap.siteSettings ? { siteSettings: snap.siteSettings } : {}),
    }
    const revision = row.revision + 1
    const updatedAt = new Date().toISOString()
    db.prepare(`UPDATE editor_state SET revision = ?, snapshot = ?, updated_at = ? WHERE id = 1`)
      .run(revision, JSON.stringify(nextSnap), updatedAt)
    db.exec('COMMIT')

    console.log(JSON.stringify({
      removedImageWidgets: removedImages,
      keptNonImageWidgets: nonImages.length,
      createdGalleryWidgets: galleryWidgets.length,
      totalImagesInGalleries: galleryWidgets.reduce((n, w) => n + w.images.length, 0),
      revision,
    }, null, 2))
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  } finally {
    db.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
