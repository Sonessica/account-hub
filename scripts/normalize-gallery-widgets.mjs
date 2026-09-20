/**
 * Normalize image gallery widgets:
 * - size 1x1
 * - coverMode random (when >1 image)
 * - coverEffect random
 * - reflow positions on a dense 1x1 grid
 *
 * Run inside the atchooo-space image with data mounted at /app/data.
 */
import { DatabaseSync } from 'node:sqlite'

const DB_PATH = process.env.DB_PATH || '/app/data/atchooo-space.sqlite'
const PER_ROW = 12
const START_Y = 2

function main() {
  const db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA busy_timeout = 10000')
  db.exec('BEGIN IMMEDIATE')
  try {
    const row = db.prepare('SELECT revision, snapshot FROM editor_state WHERE id = 1').get()
    if (!row) throw new Error('editor_state missing')
    const snap = JSON.parse(row.snapshot)
    const widgets = Array.isArray(snap.widgets) ? snap.widgets : []
    let galleryIndex = 0
    let updated = 0
    const next = widgets.map((w) => {
      if (!w || w.category !== 'image') return w
      const images = Array.isArray(w.images) ? w.images.filter((i) => i && i.src) : []
      if (!images.length && w.src) {
        images.push({ id: w.id + '-img0', src: w.src })
      }
      const x = galleryIndex % PER_ROW
      const y = START_Y + Math.floor(galleryIndex / PER_ROW)
      galleryIndex += 1
      updated += 1
      return {
        ...w,
        size: '1x1',
        x,
        y,
        images,
        src: images[0]?.src || w.src || '',
        coverId: images[0]?.id,
        coverMode: images.length > 1 ? 'random' : 'fixed',
        coverIntervalMs: w.coverIntervalMs || 15000,
        coverEffect: images.length > 1 ? 'random' : (w.coverEffect || 'crossfade'),
        objectFit: w.objectFit || 'cover',
      }
    })

    const nextSnap = {
      ...snap,
      widgets: next,
      profile: snap.profile || { name: 'ATCHOOO', description: '' },
      ...(snap.siteSettings ? { siteSettings: snap.siteSettings } : {}),
    }
    const revision = row.revision + 1
    const updatedAt = new Date().toISOString()
    db.prepare('UPDATE editor_state SET revision = ?, snapshot = ?, updated_at = ? WHERE id = 1')
      .run(revision, JSON.stringify(nextSnap), updatedAt)
    db.exec('COMMIT')
    console.log(JSON.stringify({ updatedImageWidgets: updated, revision, perRow: PER_ROW }, null, 2))
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  } finally {
    db.close()
  }
}

main()
