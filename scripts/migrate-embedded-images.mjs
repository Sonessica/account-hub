import { createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const databasePath = resolve(process.env.ACCOUNT_HUB_DB_PATH || '/app/data/account-hub.sqlite')
const mediaPath = resolve(process.env.ACCOUNT_HUB_MEDIA_PATH || '/app/data/media')
const database = new DatabaseSync(databasePath)
const row = database.prepare('SELECT revision, snapshot FROM editor_state WHERE id = 1').get()

if (!row) process.exit(0)

const snapshot = JSON.parse(row.snapshot)
let migrated = 0
let inputBytes = 0
let outputBytes = 0

async function migrate(value) {
  if (typeof value !== 'string' || !value.startsWith('data:image/')) return value
  const match = value.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s)
  if (!match) return value
  const input = Buffer.from(match[1], 'base64')
  const output = await sharp(input, { failOn: 'error' })
    .rotate()
    .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer()
  const filename = `${createHash('sha256').update(output).digest('hex').slice(0, 36)}.webp`
  await writeFile(resolve(mediaPath, filename), output, { flag: 'w' })
  migrated += 1
  inputBytes += input.byteLength
  outputBytes += output.byteLength
  return `/api/media/${filename}`
}

await mkdir(mediaPath, { recursive: true })
for (const widget of snapshot.widgets || []) {
  if (widget?.category === 'image') widget.src = await migrate(widget.src)
}
if (snapshot.profile?.avatarUrl) snapshot.profile.avatarUrl = await migrate(snapshot.profile.avatarUrl)

if (migrated) {
  database.prepare('UPDATE editor_state SET revision = ?, snapshot = ?, updated_at = ? WHERE id = 1')
    .run(row.revision + 1, JSON.stringify(snapshot), new Date().toISOString())
}

console.log(JSON.stringify({ migrated, inputBytes, outputBytes, revision: row.revision + (migrated ? 1 : 0) }))
