'use client'

/**
 * Reserved site settings (quick nav removed).
 */

export type SiteSettings = {
  _unused?: true
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {}

export function normalizeSiteSettings(_value?: unknown): SiteSettings {
  return {}
}
