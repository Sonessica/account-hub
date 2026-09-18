'use client'

/**
 * OpenBento - Image Widget
 * Card cover for a single image or an image gallery.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { BentoCard } from '@/bento/core'
import type { ImageWidgetConfig, WidgetProps } from '../types'
import { normalizeImageGallery, resolveCoverIndex } from './gallery'

export const ImageWidget: React.FC<WidgetProps<ImageWidgetConfig>> = ({
    config,
    isEditing = false,
}) => {
    const { alt, title, subtitle, size } = config
    const gallery = useMemo(() => normalizeImageGallery(config), [config])
    const { images } = gallery

    const [liveIndex, setLiveIndex] = useState(() => resolveCoverIndex(config))

    useEffect(() => {
        if (isEditing) return
        if (gallery.coverMode !== 'random' || images.length <= 1) return
        const interval = gallery.coverIntervalMs
        const offset = Math.floor(Math.random() * interval)
        let intervalId: number | undefined
        const timeoutId = window.setTimeout(() => {
            intervalId = window.setInterval(() => {
                setLiveIndex((prev) => (prev + 1) % images.length)
            }, interval)
        }, offset)
        return () => {
            window.clearTimeout(timeoutId)
            if (intervalId !== undefined) window.clearInterval(intervalId)
        }
    }, [isEditing, gallery.coverMode, gallery.coverIntervalMs, images.length])

    const displayIndex = useMemo(() => {
        if (isEditing || gallery.coverMode !== 'random' || images.length <= 1) {
            return resolveCoverIndex(config)
        }
        return liveIndex % images.length
    }, [isEditing, gallery.coverMode, images.length, liveIndex, config])

    const cover = images[displayIndex]
    const hasOverlay = title || subtitle

    if (!cover) {
        return (
            <BentoCard size={size} disableHover style={{ pointerEvents: 'none', background: '#EDEDF0' }}>
                <div className="grid h-full w-full place-items-center text-sm text-black/35">暂无图片</div>
            </BentoCard>
        )
    }

    return (
        <BentoCard size={size} disableHover style={{ pointerEvents: 'none' }}>
            <BentoCard.Image
                key={cover.id}
                src={cover.src}
                alt={cover.alt || alt || title || ''}
            />

            {hasOverlay && (
                <BentoCard.Overlay gradient="bottom">
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
        coverIntervalMs: 15_000,
        objectFit: 'cover',
        ...options,
    }
}

export default ImageWidget
