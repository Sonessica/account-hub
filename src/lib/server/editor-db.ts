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

export interface EditorVersion { id: number; space: string; revision: number; action: string; snapshot: EditorSnapshot; createdAt: string }

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
  database.exec(`
    CREATE TABLE IF NOT EXISTS editor_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      space TEXT NOT NULL,
      revision INTEGER NOT NULL,
      action TEXT NOT NULL DEFAULT 'Changed canvas',
      snapshot TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS editor_versions_space_created ON editor_versions(space, created_at DESC);
    CREATE TABLE IF NOT EXISTS hub_entities (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      data TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS custom_spaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      position INTEGER NOT NULL,
      visible INTEGER NOT NULL DEFAULT 1,
      config TEXT NOT NULL DEFAULT '{}'
    )
  `)
  database.exec(`
    CREATE TABLE IF NOT EXISTS editor_spaces (
      space TEXT PRIMARY KEY,
      revision INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  return database
}

export function readEditor(space = 'home'): StoredEditor | null {
  const row = space === 'home'
    ? getDatabase().prepare('SELECT revision, snapshot, updated_at FROM editor_state WHERE id = 1').get()
    : getDatabase().prepare('SELECT revision, snapshot, updated_at FROM editor_spaces WHERE space = ?').get(space)
  const stored = row as { revision: number; snapshot: string; updated_at: string } | undefined
  if (!stored) return null
  const parsed = JSON.parse(stored.snapshot) as Partial<EditorSnapshot> & { desktopWidgets?: unknown[] }
  const snapshot: EditorSnapshot = {
    widgets: normalizeWidgets(Array.isArray(parsed.widgets) ? parsed.widgets : parsed.desktopWidgets),
    profile: parsed.profile || { name: 'ATCHOOO', description: '' },
    ...(parsed.siteSettings ? { siteSettings: parsed.siteSettings } : {}),
  }
  return { ...snapshot, revision: stored.revision, updatedAt: stored.updated_at }
}

export function saveEditor(snapshot: EditorSnapshot, expectedRevision: number, space = 'home'): StoredEditor | 'conflict' {
  const db = getDatabase()
  db.exec('BEGIN IMMEDIATE')
  try {
    const existing = (space === 'home'
      ? db.prepare('SELECT revision FROM editor_state WHERE id = 1').get()
      : db.prepare('SELECT revision FROM editor_spaces WHERE space = ?').get(space)) as { revision: number } | undefined
    if ((existing?.revision ?? 0) !== expectedRevision) {
      db.exec('ROLLBACK')
      return 'conflict'
    }
    const revision = expectedRevision + 1
    const updatedAt = new Date().toISOString()
    const normalized = { ...snapshot, widgets: normalizeWidgets(snapshot.widgets) }
    if (existing) {
      const previous = readEditor(space)
      if (previous) db.prepare(`INSERT INTO editor_versions (space, revision, action, snapshot, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(space, previous.revision, 'Changed canvas', JSON.stringify(previous), updatedAt)
    }
    if (space === 'home') {
      db.prepare(`INSERT INTO editor_state (id, revision, snapshot, updated_at)
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET revision = excluded.revision,
        snapshot = excluded.snapshot, updated_at = excluded.updated_at`)
        .run(revision, JSON.stringify(normalized), updatedAt)
    } else {
      db.prepare(`INSERT INTO editor_spaces (space, revision, snapshot, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(space) DO UPDATE SET revision = excluded.revision,
        snapshot = excluded.snapshot, updated_at = excluded.updated_at`)
        .run(space, revision, JSON.stringify(normalized), updatedAt)
    }
    db.exec('COMMIT')
    return { ...normalized, revision, updatedAt }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function listEditorVersions(space = 'home', limit = 30): EditorVersion[] {
  const rows = getDatabase().prepare(`SELECT id, space, revision, action, snapshot, created_at FROM editor_versions WHERE space = ? ORDER BY id DESC LIMIT ?`).all(space, limit) as { id: number; space: string; revision: number; action: string; snapshot: string; created_at: string }[]
  return rows.map(row => ({ id: row.id, space: row.space, revision: row.revision, action: row.action, snapshot: JSON.parse(row.snapshot), createdAt: row.created_at }))
}
