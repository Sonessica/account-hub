import 'server-only'

import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface EditorSnapshot {
  widgets: unknown[]
  profile: { name: string; description: string; avatarUrl?: string }
  siteSettings?: {
    quickNav?: { id?: string; label: string; url: string }[]
  }
}

export interface StoredEditor extends EditorSnapshot {
  revision: number
  updatedAt: string
}

let database: DatabaseSync | undefined

function normalizeWidgets(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((widget) => {
    if (!widget || typeof widget !== 'object') return widget
    const data = widget as Record<string, unknown>
    return data.size === 'bar' ? { ...data, size: '2x1' } : widget
  })
}

function getDatabase() {
  if (database) return database
  const file = resolve(process.env.ACCOUNT_HUB_DB_PATH || '/app/data/account-hub.sqlite')
  mkdirSync(dirname(file), { recursive: true })
  database = new DatabaseSync(file)
  database.exec('PRAGMA journal_mode = WAL')
  database.exec('PRAGMA busy_timeout = 5000')
  database.exec(`
    CREATE TABLE IF NOT EXISTS editor_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      revision INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  return database
}

export function readEditor(): StoredEditor | null {
  const row = getDatabase().prepare('SELECT revision, snapshot, updated_at FROM editor_state WHERE id = 1')
    .get() as { revision: number; snapshot: string; updated_at: string } | undefined
  if (!row) return null
  const parsed = JSON.parse(row.snapshot) as Partial<EditorSnapshot> & { desktopWidgets?: unknown[] }
  const snapshot: EditorSnapshot = {
    widgets: normalizeWidgets(Array.isArray(parsed.widgets) ? parsed.widgets : parsed.desktopWidgets),
    profile: parsed.profile || { name: 'ATCHOOO', description: '' },
    ...(parsed.siteSettings ? { siteSettings: parsed.siteSettings } : {}),
  }
  return { ...snapshot, revision: row.revision, updatedAt: row.updated_at }
}

export function saveEditor(snapshot: EditorSnapshot, expectedRevision: number): StoredEditor | 'conflict' {
  const db = getDatabase()
  db.exec('BEGIN IMMEDIATE')
  try {
    const existing = db.prepare('SELECT revision FROM editor_state WHERE id = 1').get() as { revision: number } | undefined
    if ((existing?.revision ?? 0) !== expectedRevision) {
      db.exec('ROLLBACK')
      return 'conflict'
    }
    const revision = expectedRevision + 1
    const updatedAt = new Date().toISOString()
    const normalized = { ...snapshot, widgets: normalizeWidgets(snapshot.widgets) }
    db.prepare(`INSERT INTO editor_state (id, revision, snapshot, updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET revision = excluded.revision,
      snapshot = excluded.snapshot, updated_at = excluded.updated_at`)
      .run(revision, JSON.stringify(normalized), updatedAt)
    db.exec('COMMIT')
    return { ...normalized, revision, updatedAt }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
