import { NextResponse } from 'next/server'
import { checkPassword, clearSession, isAuthenticated, sameOrigin, setSession } from '@/lib/server/editor-auth'

export const runtime = 'nodejs'
const MAX_FAILURES = 5
const LOCK_MS = 15 * 60 * 1000
const failures = new Map<string, { count: number; until: number }>()

function clientKey(request: Request) {
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function GET() {
  return NextResponse.json({ authenticated: await isAuthenticated() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const key = clientKey(request)
  const now = Date.now()
  const current = failures.get(key)
  if (current && current.until > now && current.count >= MAX_FAILURES) {
    return NextResponse.json({ error: 'Too many attempts' }, {
      status: 429, headers: { 'Retry-After': String(Math.ceil((current.until - now) / 1000)) },
    })
  }
  const body = await request.json().catch(() => null)
  if (typeof body?.password !== 'string' || !checkPassword(body.password)) {
    const count = current && current.until > now ? current.count + 1 : 1
    if (failures.size >= 10_000) failures.delete(failures.keys().next().value!)
    failures.set(key, { count, until: now + LOCK_MS })
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }
  failures.delete(key)
  await setSession()
  return NextResponse.json({ authenticated: true })
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  await clearSession()
  return NextResponse.json({ authenticated: false })
}
