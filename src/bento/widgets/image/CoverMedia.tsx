'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CoverEffect, GalleryImage } from '../types'

const CONCRETE_EFFECTS = [
  'crossfade',
  'blur',
  'drift',
  'kenburns',
  'reveal',
  'shutter',
] as const

type ConcreteEffect = (typeof CONCRETE_EFFECTS)[number]

const REVEAL_FROM = [
  'inset(0% 100% 0% 0%)',
  'inset(0% 0% 0% 100%)',
  'inset(0% 0% 100% 0%)',
  'inset(100% 0% 0% 0%)',
  'circle(0% at 30% 40%)',
  'circle(0% at 70% 60%)',
] as const

function pickConcreteEffect(effect: CoverEffect): ConcreteEffect {
  if (effect === 'random') {
    return CONCRETE_EFFECTS[Math.floor(Math.random() * CONCRETE_EFFECTS.length)]
  }
  return effect
}

function pickRevealFrom() {
  return REVEAL_FROM[Math.floor(Math.random() * REVEAL_FROM.length)]
}

function buildLayerMotion(
  effect: ConcreteEffect,
  options: { intervalMs: number; revealFrom: string; fast?: boolean },
) {
  // Hover tour advances on a content clock (2s photos / video end); keep
  // page transitions short so they never fight that rhythm.
  if (options.fast) {
    return {
      initial: { opacity: 0, scale: 1 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
      },
      exit: {
        opacity: 0,
        transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] as const },
      },
    }
  }
  switch (effect) {
    case 'blur':
      return {
        initial: { opacity: 0, scale: 1.02, filter: 'blur(8px)' },
        animate: {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
        },
        exit: {
          opacity: 0,
          scale: 1.03,
          filter: 'blur(8px)',
          transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] as const },
        },
      }
    case 'drift':
      return {
        initial: { opacity: 0, x: 14 },
        animate: {
          opacity: 1,
          x: 0,
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
        },
        exit: {
          opacity: 0,
          x: -12,
          transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
        },
      }
    case 'kenburns': {
      const seconds = Math.max(options.intervalMs, 4000) / 1000
      return {
        initial: { opacity: 0, scale: 1 },
        animate: {
          opacity: 1,
          scale: 1.05,
          transition: {
            opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
            scale: { duration: seconds, ease: 'linear' as const },
          },
        },
        exit: {
          opacity: 0,
          scale: 1.06,
          transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const },
        },
      }
    }
    case 'reveal':
      return {
        initial: { opacity: 1, clipPath: options.revealFrom },
        animate: {
          opacity: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
        },
        exit: {
          opacity: 0,
          transition: { duration: 0.35, ease: 'easeOut' as const },
        },
      }
    case 'shutter':
      return {
        initial: { opacity: 0.2, scale: 1.015 },
        animate: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.18, ease: 'easeOut' as const },
        },
        exit: {
          opacity: 0,
          scale: 1.01,
          transition: { duration: 0.16, ease: 'easeIn' as const },
        },
      }
    case 'crossfade':
    default:
      return {
        initial: { opacity: 0, scale: 0.97 },
        animate: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] as const },
        },
        exit: {
          opacity: 0,
          scale: 1.04,
          transition: { duration: 0.52, ease: [0.4, 0, 0.2, 1] as const },
        },
      }
  }
}

export function CoverMedia({
  image,
  effect,
  objectFit = 'cover',
  alt,
  intervalMs,
  enableEffect = true,
  effectSeed = 0,
  preview = false,
  tour = false,
  videoMaxMs = 5_000,
  onMediaEnd,
}: {
  image: GalleryImage
  effect: CoverEffect
  objectFit?: 'cover' | 'contain'
  alt?: string
  intervalMs: number
  /** When false (edit mode / single image), render without transition effects */
  enableEffect?: boolean
  /** Change this value to re-roll random effect + reveal direction */
  effectSeed?: number
  /** Controlled by parent card hover; plays muted live/video when true */
  preview?: boolean
  /** Multi-page hover tour: report completion so the parent can advance */
  tour?: boolean
  videoMaxMs?: number
  /** Fired when the current video/live finishes (or hits the tour time cap) */
  onMediaEnd?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onMediaEndRef = useRef(onMediaEnd)
  const mediaSettledRef = useRef(false)
  const currentLayerRef = useRef('')
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    onMediaEndRef.current = onMediaEnd
  }, [onMediaEnd])
  const notifyMediaEnd = (sourceLayer: string) => {
    // AnimatePresence keeps the outgoing layer mounted during its exit. Ignore
    // late ended/error events from that layer after a new item is current.
    if (sourceLayer !== currentLayerRef.current) return
    // `ended` and the tour time cap can both fire; advance only once per item.
    if (mediaSettledRef.current) return
    mediaSettledRef.current = true
    onMediaEndRef.current?.()
  }
  const resolved = useMemo(() => {
    if (!enableEffect || tour) {
      return { concrete: 'crossfade' as ConcreteEffect, revealFrom: 'inset(0% 0% 0% 0%)', seed: effectSeed }
    }
    const concrete = pickConcreteEffect(effect)
    const revealFrom = concrete === 'reveal' ? pickRevealFrom() : 'inset(0% 0% 0% 0%)'
    return { concrete, revealFrom, seed: effectSeed }
  }, [effect, effectSeed, enableEffect, tour])

  const motionCfg = buildLayerMotion(resolved.concrete, {
    intervalMs,
    revealFrom: resolved.revealFrom,
    fast: tour,
  })
  const layerKey = enableEffect
    ? `${image.id}::${resolved.concrete}::${effectSeed}::${resolved.revealFrom}`
    : image.id
  useLayoutEffect(() => {
    currentLayerRef.current = layerKey
  }, [layerKey])

  const stopPreview = () => {
    const video = videoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }
  }

  useEffect(() => {
    mediaSettledRef.current = false
  }, [image.id, image.videoSrc, layerKey, preview, tour])

  // Track playback via media events so effects never setState synchronously.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const syncPlaying = () => setPlaying(!video.paused && !video.ended && !video.error)
    video.addEventListener('play', syncPlaying)
    video.addEventListener('pause', syncPlaying)
    video.addEventListener('ended', syncPlaying)
    video.addEventListener('error', syncPlaying)
    return () => {
      video.removeEventListener('play', syncPlaying)
      video.removeEventListener('pause', syncPlaying)
      video.removeEventListener('ended', syncPlaying)
      video.removeEventListener('error', syncPlaying)
    }
  }, [image.id, image.videoSrc, layerKey])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!preview || !image.videoSrc) {
      video.pause()
      video.currentTime = 0
      return
    }
    let cancelled = false
    void video.play().catch(() => {
      if (cancelled) return
      // Tour must not stall on autoplay rejection.
      if (tour) notifyMediaEnd(layerKey)
    })
    if (!tour) return
    const cap = window.setTimeout(() => {
      if (cancelled) return
      notifyMediaEnd(layerKey)
    }, videoMaxMs)
    return () => {
      cancelled = true
      window.clearTimeout(cap)
    }
  }, [preview, tour, videoMaxMs, image.videoSrc, image.id, layerKey])

  useEffect(() => () => {
    const video = videoRef.current
    if (video) video.pause()
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={layerKey}
          className="absolute inset-0"
          initial={enableEffect ? motionCfg.initial : false}
          animate={enableEffect ? motionCfg.animate : { opacity: 1, scale: 1 }}
          exit={enableEffect ? motionCfg.exit : { opacity: 0 }}
        >
          <img
            src={image.src}
            alt={alt || image.alt || ''}
            draggable={false}
            className="h-full w-full select-none"
            style={{ objectFit }}
          />
          {image.videoSrc && (
            <video
              ref={videoRef}
              src={preview ? image.videoSrc : undefined}
              poster={image.src}
              muted
              playsInline
              preload={preview && tour ? 'auto' : 'none'}
              onEnded={() => {
                if (tour) notifyMediaEnd(layerKey)
                else stopPreview()
              }}
              onError={() => {
                if (tour) notifyMediaEnd(layerKey)
                else stopPreview()
              }}
              className="absolute inset-0 h-full w-full select-none transition-opacity duration-200"
              style={{ objectFit, opacity: playing ? 1 : 0 }}
            />
          )}
          {image.videoSrc && !playing && (
            <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold tracking-wide text-white backdrop-blur-sm">
              {image.type === 'live-photo' ? 'LIVE' : '▶ VIDEO'}
            </div>
          )}
          {enableEffect && resolved.concrete === 'shutter' && (
            <motion.div
              key={`flash-${layerKey}`}
              className="pointer-events-none absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.12, 0] }}
              transition={{ duration: 0.1, times: [0, 0.45, 1], ease: 'linear' }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
