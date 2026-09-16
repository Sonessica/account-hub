import { NextResponse } from 'next/server'
import { checkPassword, clearSession, isAuthenticated, sameOrigin, setSession } from '@/lib/server/editor-auth'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ authenticated: await isAuthenticated() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (typeof body?.password !== 'string' || !checkPassword(body.password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }
  await setSession()
  return NextResponse.json({ authenticated: true })
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  await clearSession()
  return NextResponse.json({ authenticated: false })
}
