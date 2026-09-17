'use client'

/**
 * Site-level settings for the personal hub (profile + quick nav + data tools).
 */

export type QuickNavItem = {
  id: string
  label: string
  url: string
}

export type SiteSettings = {
  quickNav: QuickNavItem[]
}

export const DEFAULT_QUICK_NAV: QuickNavItem[] = [
  { id: 'vault', label: 'Vault', url: 'https://Vaultwarden.atchooo.com' },
  { id: 'home', label: 'Home', url: 'https://home.atchooo.com' },
  { id: 'komga', label: 'Komga', url: 'https://komga.atchooo.com' },
  { id: 'blinko', label: 'Blinko', url: 'https://blinko.atchooo.com' },
  { id: 'oneapi', label: 'API', url: 'https://oneapi.atchooo.com' },
]

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  quickNav: DEFAULT_QUICK_NAV,
}

export function normalizeSiteSettings(value: unknown): SiteSettings {
  const data = value as Partial<SiteSettings> | null | undefined
  if (!data || !Array.isArray(data.quickNav)) return { ...DEFAULT_SITE_SETTINGS }
  const quickNav = data.quickNav
    .filter((item): item is QuickNavItem => !!item && typeof item.label === 'string' && typeof item.url === 'string')
    .map((item) => ({
      id: String(item.id || crypto.randomUUID()),
      label: item.label.slice(0, 40),
      url: item.url.slice(0, 500),
    }))
    .slice(0, 20)
  return { quickNav: quickNav.length ? quickNav : [...DEFAULT_QUICK_NAV] }
}
