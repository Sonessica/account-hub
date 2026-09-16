import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE = 'account_hub_session'
const MAX_AGE = 60 * 60 * 24 * 30

function secret() {
  const value = process.env.ACCOUNT_HUB_ADMIN_PASSWORD
  if (!value || value.length < 16) throw new Error('ACCOUNT_HUB_ADMIN_PASSWORD must have at least 16 characters')
  return value
}

function signature(expires: number) {
  return createHmac('sha256', secret()).update(`account-hub:${expires}`).digest('hex')
}

export function checkPassword(candidate: string) {
  const expected = Buffer.from(secret())
  const actual = Buffer.from(candidate)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function isAuthenticated() {
  const value = (await cookies()).get(COOKIE)?.value
  if (!value) return false
  const [expiryString, supplied] = value.split('.')
  const expiry = Number(expiryString)
  if (!Number.isSafeInteger(expiry) || expiry < Date.now() || !supplied || supplied.length !== 64) return false
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(signature(expiry)))
}

export async function setSession() {
  const expires = Date.now() + MAX_AGE * 1000
  ;(await cookies()).set(COOKIE, `${expires}.${signature(expires)}`, {
    httpOnly: true, secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ?? true, sameSite: 'strict',
    path: '/', maxAge: MAX_AGE,
  })
}

export async function clearSession() {
  ;(await cookies()).delete(COOKIE)
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const expected = process.env.NEXT_PUBLIC_APP_URL
  return !!origin && !!expected && origin === expected
}
