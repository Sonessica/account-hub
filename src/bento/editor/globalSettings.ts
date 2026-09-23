import type { CoverEffect } from '../widgets/types'

export type GlobalSettings = {
  photoDwellMs: number
  videoMaxMs: number
  hoverDelayMs: number
  randomCoverIntervalMs: number
  hoverVideoPreview: boolean
  reducedMotion: boolean
  defaultCoverEffect: CoverEffect
  defaultImageFit: 'cover' | 'contain'
  defaultCanvasZoom: number
  autoRecenter: boolean
  splashEnabled: boolean
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  photoDwellMs: 2_000,
  videoMaxMs: 5_000,
  hoverDelayMs: 300,
  randomCoverIntervalMs: 15_000,
  hoverVideoPreview: true,
  reducedMotion: false,
  defaultCoverEffect: 'crossfade',
  defaultImageFit: 'cover',
  defaultCanvasZoom: 1,
  autoRecenter: true,
  splashEnabled: true,
}

const COVER_EFFECTS: CoverEffect[] = [
  'crossfade', 'blur', 'drift', 'kenburns', 'reveal', 'shutter', 'random',
]

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function boolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeGlobalSettings(value: unknown): GlobalSettings {
  const data = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const defaults = DEFAULT_GLOBAL_SETTINGS
  return {
    photoDwellMs: boundedNumber(data.photoDwellMs, defaults.photoDwellMs, 500, 10_000),
    videoMaxMs: boundedNumber(data.videoMaxMs, defaults.videoMaxMs, 1_000, 30_000),
    hoverDelayMs: boundedNumber(data.hoverDelayMs, defaults.hoverDelayMs, 0, 2_000),
    randomCoverIntervalMs: boundedNumber(data.randomCoverIntervalMs, defaults.randomCoverIntervalMs, 2_000, 120_000),
    hoverVideoPreview: boolean(data.hoverVideoPreview, defaults.hoverVideoPreview),
    reducedMotion: boolean(data.reducedMotion, defaults.reducedMotion),
    defaultCoverEffect: COVER_EFFECTS.includes(data.defaultCoverEffect as CoverEffect)
      ? data.defaultCoverEffect as CoverEffect : defaults.defaultCoverEffect,
    defaultImageFit: data.defaultImageFit === 'contain' ? 'contain' : defaults.defaultImageFit,
    defaultCanvasZoom: boundedNumber(data.defaultCanvasZoom, defaults.defaultCanvasZoom, 0.35, 1.8),
    autoRecenter: boolean(data.autoRecenter, defaults.autoRecenter),
    splashEnabled: boolean(data.splashEnabled, defaults.splashEnabled),
  }
}
