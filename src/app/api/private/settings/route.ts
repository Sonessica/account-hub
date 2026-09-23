import { NextResponse } from 'next/server'
import { readGlobalSettings, saveGlobalSettings } from '@/lib/server/editor-db'
import { normalizeGlobalSettings } from '@/bento/editor/globalSettings'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(readGlobalSettings(), { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: Request) {
  const raw = await request.text()
  if (Buffer.byteLength(raw) > 10_000) {
    return NextResponse.json({ error: 'Settings too large' }, { status: 413 })
  }
  let body: { revision?: unknown; settings?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!Number.isSafeInteger(body?.revision) || (body.revision as number) < 0 ||
      !body?.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) {
    return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })
  }
  const saved = saveGlobalSettings(normalizeGlobalSettings(body.settings), body.revision as number)
  if (saved === 'conflict') {
    return NextResponse.json({ error: 'A newer version exists', ...readGlobalSettings() }, { status: 409 })
  }
  return NextResponse.json(saved, { headers: { 'Cache-Control': 'no-store' } })
}
