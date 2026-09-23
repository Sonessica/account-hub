'use client'

/**
 * OpenBento - Image Widget
 * Card cover for a single image or an image gallery.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BentoCard } from '@/bento/core'
import { useGlobalSettings } from '@/bento/editor/GlobalSettingsProvider'
import type { ImageWidgetConfig, WidgetProps } from '../types'
import { normalizeImageGallery, resolveCoverIndex } from './gallery'
import { CoverMedia } from './CoverMedia'

export const ImageWidget: React.FC<WidgetProps<ImageWidgetConfig>> = ({
    config,
    isEditing = false,
}) => {
    const { settings } = useGlobalSettings()
    const { alt, title, subtitle, size, objectFit } = config
    const gallery = useMemo(() => normalizeImageGallery(config), [config])
    const { images } = gallery
    const coverIntervalMs = config.coverIntervalMs ?? settings.randomCoverIntervalMs

    const [liveIndex, setLiveIndex] = useState(() => resolveCoverIndex(config))
    const [effectSeed, setEffectSeed] = useState(0)
    const [pageVisible, setPageVisible] = useState(true)
    const [mediaPreview, setMediaPreview] = useState(false)
    const hoverTimer = useRef<number | undefined>(undefined)
    /** Bumped on hover enter/leave so stale tour callbacks cannot advance. */
    const tourGen = useRef(0)
    const activeTourGen = useRef(0)
    const displayIndexRef = useRef(0)

    const isMulti = images.length > 1
    const tourActive = mediaPreview && isMulti

    useEffect(() => {
        const sync = () => {
            const visible = document.visibilityState === 'visible'
            setPageVisible(visible)
            if (!visible) {
                window.clearTimeout(hoverTimer.current)
                tourGen.current += 1
                setMediaPreview(false)
            }
        }
        sync()
        document.addEventListener('visibilitychange', sync)
        return () => document.removeEventListener('visibilitychange', sync)
    }, [])

    useEffect(() => {
        if (isEditing) return
        if (!pageVisible) return
        // Idle clock pauses while hover tour / video preview owns the gallery.
        if (mediaPreview) return
        if (gallery.coverMode !== 'random' || images.length <= 1) return
        const interval = coverIntervalMs
        const offset = Math.floor(Math.random() * interval)
        let intervalId: number | undefined
        const timeoutId = window.setTimeout(() => {
            intervalId = window.setInterval(() => {
                setLiveIndex((prev) => (prev + 1) % images.length)
                setEffectSeed((s) => s + 1)
            }, interval)
        }, offset)
        return () => {
            window.clearTimeout(timeoutId)
            if (intervalId !== undefined) window.clearInterval(intervalId)
        }
    }, [isEditing, pageVisible, mediaPreview, gallery.coverMode, coverIntervalMs, images.length])

    const displayIndex = useMemo(() => {
        if (isEditing || images.length <= 1) {
            return resolveCoverIndex(config)
        }
        // Hover tour always walks `liveIndex`, including fixed-cover galleries.
        if (mediaPreview) {
            return liveIndex % images.length
        }
        if (gallery.coverMode !== 'random') {
            return resolveCoverIndex(config)
        }
        return liveIndex % images.length
    }, [isEditing, gallery.coverMode, images.length, liveIndex, config, mediaPreview])

    useEffect(() => {
        displayIndexRef.current = displayIndex
    }, [displayIndex])

    const cover = images[displayIndex]
    const hasOverlay = title || subtitle
    const enableEffect = !isEditing && !settings.reducedMotion && images.length > 1
    const configuredEffect = config.coverEffect ?? settings.defaultCoverEffect

    useEffect(() => {
        return () => window.clearTimeout(hoverTimer.current)
    }, [])

    // Adjust state during render when entering edit mode (no effect needed).
    if (isEditing && mediaPreview) {
        setMediaPreview(false)
    }

    const advanceTour = useCallback((gen: number) => {
        if (gen !== tourGen.current) return
        setLiveIndex((prev) => (prev + 1) % Math.max(images.length, 1))
        setEffectSeed((s) => s + 1)
    }, [images.length])

    const onMediaEnd = useCallback(() => {
        advanceTour(activeTourGen.current)
    }, [advanceTour])

    // Still photos in a hover tour dwell briefly, then advance.
    useEffect(() => {
        if (!tourActive) return
        const current = images[displayIndex]
        if (!current || (current.videoSrc && settings.hoverVideoPreview)) return
        const gen = tourGen.current
        activeTourGen.current = gen
        const timer = window.setTimeout(() => advanceTour(gen), settings.photoDwellMs)
        return () => window.clearTimeout(timer)
    }, [tourActive, displayIndex, images, advanceTour, settings.photoDwellMs, settings.hoverVideoPreview])

    // Keep activeTourGen aligned when the tour lands on a video/live item.
    useEffect(() => {
        if (!tourActive) return
        const current = images[displayIndex]
        if (current?.videoSrc && settings.hoverVideoPreview) activeTourGen.current = tourGen.current
    }, [tourActive, displayIndex, images, settings.hoverVideoPreview])

    const onCardPointerEnter = () => {
        if (isEditing) return
        const multi = images.length > 1
        if (!multi && (!cover?.videoSrc || !settings.hoverVideoPreview)) return
        window.clearTimeout(hoverTimer.current)
        hoverTimer.current = window.setTimeout(() => {
            if (multi) {
                tourGen.current += 1
                activeTourGen.current = tourGen.current
                setLiveIndex(displayIndexRef.current)
            }
            setMediaPreview(true)
        }, settings.hoverDelayMs)
    }

    const onCardPointerLeave = () => {
        window.clearTimeout(hoverTimer.current)
        tourGen.current += 1
        setMediaPreview(false)
    }

    if (!cover) {
        return (
            <BentoCard size={size} disableHover style={{ pointerEvents: 'none', background: '#EDEDF0' }}>
                <div className="grid h-full w-full place-items-center text-sm text-black/35">暂无图片</div>
            </BentoCard>
        )
    }

    return (
        <BentoCard
            size={size}
            disableHover
            style={{ pointerEvents: isEditing ? 'none' : 'auto', position: 'relative', overflow: 'hidden' }}
            onPointerEnter={onCardPointerEnter}
            onPointerLeave={onCardPointerLeave}
        >
            <CoverMedia
                image={cover}
                effect={configuredEffect}
                objectFit={objectFit ?? settings.defaultImageFit}
                alt={cover.alt || alt || title || ''}
                intervalMs={coverIntervalMs}
                enableEffect={enableEffect}
                effectSeed={effectSeed}
                preview={mediaPreview && settings.hoverVideoPreview}
                tour={tourActive}
                videoMaxMs={settings.videoMaxMs}
                onMediaEnd={onMediaEnd}
            />

            {hasOverlay && (
                <BentoCard.Overlay gradient="bottom" style={{ pointerEvents: 'none' }}>
                    {title && (
                        <BentoCard.Title color="inverse" size="lg">
                            {title}
                        </BentoCard.Title>
                    )}
                    {subtitle && (
                        <div style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.8)',
                            marginTop: 4,
                        }}>
                            {subtitle}
                        </div>
                    )}
                </BentoCard.Overlay>
            )}

            {!isEditing && images.length > 1 && (
                <div
                    className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white"
                >
                    {displayIndex + 1}/{images.length}
                </div>
            )}
        </BentoCard>
    )
}

export function createImageWidgetConfig(
    src: string,
    size: ImageWidgetConfig['size'] = '1x1',
    options: Partial<ImageWidgetConfig> = {},
): ImageWidgetConfig {
    const imageId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    return {
        id: `image-${Date.now()}`,
        category: 'image',
        size,
        src,
        images: [{ id: imageId, src }],
        coverMode: 'fixed',
        coverId: imageId,
        ...options,
    }
}

export default ImageWidget
