'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
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
  options: { intervalMs: number; revealFrom: string },
) {
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
}) {
  const resolved = useMemo(() => {
    if (!enableEffect) {
      return { concrete: 'crossfade' as ConcreteEffect, revealFrom: 'inset(0% 0% 0% 0%)', seed: effectSeed }
    }
    const concrete = pickConcreteEffect(effect)
    const revealFrom = concrete === 'reveal' ? pickRevealFrom() : 'inset(0% 0% 0% 0%)'
    return { concrete, revealFrom, seed: effectSeed }
  }, [effect, effectSeed, enableEffect])

  const motionCfg = buildLayerMotion(resolved.concrete, {
    intervalMs,
    revealFrom: resolved.revealFrom,
  })
  const layerKey = enableEffect
    ? `${image.id}::${resolved.concrete}::${effectSeed}::${resolved.revealFrom}`
    : image.id

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
