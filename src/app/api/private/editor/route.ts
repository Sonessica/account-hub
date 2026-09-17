import { NextResponse } from 'next/server'
import { readEditor, saveEditor, type EditorSnapshot } from '@/lib/server/editor-db'

export const runtime = 'nodejs'
const MAX_SNAPSHOT_BYTES = 20_000_000

// Public personal hub: no password gate. Snapshot is the single shared page.
export async function GET() {
  return NextResponse.json({ snapshot: readEditor() }, { headers: { 'Cache-Control': 'no-store' } })
}

function validSnapshot(value: unknown): value is EditorSnapshot {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  const profile = data.profile as Record<string, unknown> | undefined
  return Array.isArray(data.widgets) && data.widgets.length <= 500 &&
    !!profile && typeof profile.name === 'string' && profile.name.length <= 200 &&
    typeof profile.description === 'string' && profile.description.length <= 5000 &&
    (profile.avatarUrl === undefined || typeof profile.avatarUrl === 'string')
}

export async function PUT(request: Request) {
  const length = Number(request.headers.get('content-length') || 0)
  if (length > MAX_SNAPSHOT_BYTES) return NextResponse.json({ error: 'Snapshot too large' }, { status: 413 })
  const raw = await request.text()
  if (Buffer.byteLength(raw) > MAX_SNAPSHOT_BYTES) return NextResponse.json({ error: 'Snapshot too large' }, { status: 413 })
  const body = (() => { try { return JSON.parse(raw) } catch { return null } })()
  if (!Number.isSafeInteger(body?.revision) || body.revision < 0 || !validSnapshot(body?.snapshot)) {
    return NextResponse.json({ error: 'Invalid snapshot' }, { status: 400 })
  }
  const saved = saveEditor(body.snapshot, body.revision)
  if (saved === 'conflict') return NextResponse.json({ error: 'A newer version exists', snapshot: readEditor() }, { status: 409 })
  return NextResponse.json({ snapshot: saved })
}
