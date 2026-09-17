'use client'

/**
 * [INPUT]: (LinkWidgetConfig, onClick, isEditing) - Link configuration, click handler, edit mode flag
 * [OUTPUT]: (LinkWidget, PlatformCardContent, createLinkWidgetConfig) - Link card component and related utility functions
 * [POS]: Located at /bento/widgets/link Widget implementation, built on BentoCard, provides platform link display functionality.
 * 
 * [PROTOCOL]:
 * 1. Once this file's logic changes, this Header must be synchronized immediately.
 * 2. After update, must check upward whether /src/bento/widgets/.folder.md description is still accurate.
 */

import React, { useState } from 'react'
import { BentoCard } from '@/bento/core'
import type { LinkWidgetConfig, WidgetProps, WidgetSize } from '../types'
import { PLATFORM_REGISTRY, extractPlatformInfo } from '../registry'
import Image from 'next/image'

// ============ Size-Responsive Platform Card Content ============

interface PlatformCardContentProps {
    icon: React.ReactNode
    iconBg?: string
    iconShadow?: string
    title: string
    subtitle?: string
    action?: {
        label: string
        count?: number | string
        color?: string
        textColor?: string
        shape?: 'rounded' | 'pill'
        borderRadius?: number
    }
    textColor?: string
    subtitleColor?: string
    widgetSize: WidgetSize // New: responsive size
}

// Get layout configuration based on size
function getSizeLayout(size: WidgetSize) {
    switch (size) {
        case '1x1':
            return {
                iconSize: 40,
                titleTop: 52,
                subtitleTop: 69,
                actionTop: 97,
                fontSize: 14,
                subtitleFontSize: 12,
                actionFontSize: 12,
                lineClamp: 3,
                horizontal: false,
                isBar: false,
            }
        case '2x1':
            return {
                iconSize: 40,
                titleTop: 52,
                subtitleTop: 69,
                actionTop: 97,
                fontSize: 14,
                subtitleFontSize: 12,
                actionFontSize: 12,
                lineClamp: 2,
                horizontal: true,
                rightContentWidth: '50%',
                isBar: false,
            }
        case '1x2':
            return {
                iconSize: 40,
                titleTop: 52,
                subtitleTop: 69,
                actionTop: 97,
                fontSize: 14,
                subtitleFontSize: 12,
                actionFontSize: 12,
                lineClamp: 6,
                horizontal: false,
                hasExtraContent: true,
                isBar: false,
            }
        case '2x2':
            return {
                iconSize: 56,
                titleTop: 72,
                subtitleTop: 94,
                actionTop: 120,
                fontSize: 18,
                subtitleFontSize: 14,
                actionFontSize: 14,
                lineClamp: 4,
                horizontal: false,
                hasExtraContent: true,
                isBar: false,
            }
        case 'bar':
            // 390×68 thin horizontal bar layout
            return {
                iconSize: 28,
                titleTop: 0,
                subtitleTop: 0,
                actionTop: 0,
                fontSize: 14,
                subtitleFontSize: 12,
                actionFontSize: 11,
                lineClamp: 1,
                horizontal: true,
                isBar: true, // Special compact layout
            }
        default:
            return {
                iconSize: 40,
                titleTop: 52,
                subtitleTop: 69,
                actionTop: 97,
                fontSize: 14,
                subtitleFontSize: 12,
                actionFontSize: 12,
                lineClamp: 3,
                horizontal: false,
                isBar: false,
            }
    }
}


const PlatformCardContent: React.FC<PlatformCardContentProps> = ({
    icon,
    iconBg = '#fff',
    iconShadow = '0px 0.6px 2px rgba(0, 0, 0, 0.16)',
    title,
    subtitle,
    action,
    textColor = '#1a1a1a',
    subtitleColor = 'rgba(0, 0, 0, 0.6)',
    widgetSize
}) => {
    const layout = getSizeLayout(widgetSize)
    const iconRadius = layout.iconSize >= 40 ? (layout.iconSize === 56 ? 12 : 10) : 8

    // Bar size: Special compact horizontal layout
    if (layout.isBar) {
        return (
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                pointerEvents: 'none',
            }}>
                {/* Icon */}
                <div style={{
                    width: layout.iconSize,
                    height: layout.iconSize,
                    borderRadius: iconRadius,
                    backgroundColor: iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: iconBg === 'transparent' ? 'none' : iconShadow,
                    overflow: 'hidden',
                    flexShrink: 0,
                }}>
                    {icon}
                </div>

                {/* Title */}
                <div style={{
                    flex: 1,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: layout.fontSize,
                    fontWeight: 500,
                    lineHeight: '18px',
                    letterSpacing: '-0.01em',
                    color: textColor,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {title}
                </div>

                {/* Action Button (if exists) */}
                {action && (
                    <button style={{
                        height: 26,
                        paddingInline: 12,
                        borderRadius: action.borderRadius || 6,
                        backgroundColor: action.color || '#4093ef',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 11,
                        fontWeight: 600,
                        color: action.textColor || '#ffffff',
                        pointerEvents: 'auto',
                        flexShrink: 0,
                    }}>
                        {action.label}
                    </button>
                )}
            </div>
        )
    }

    // Standard layout (1x1, 2x1, 1x2, 2x2)
    return (
        <div style={{
            position: 'absolute',
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            pointerEvents: 'none',
        }}>
            {/* Icon */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: layout.iconSize,
                height: layout.iconSize,
                borderRadius: iconRadius,
                backgroundColor: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: iconBg === 'transparent' ? 'none' : iconShadow,
                overflow: 'hidden',
                // If transparent background (Full-bleed icon), no outer border visibility needed
                border: iconBg === 'transparent' ? 'none' : 'none',
            }}>
                {icon}
                {/* Only show inner border highlight on non-transparent background */}
                {iconBg !== 'transparent' && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: iconRadius,
                        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.06)',
                        pointerEvents: 'none',
                    }} />
                )}
            </div>


            {/* Title */}
            <div style={{
                position: 'absolute',
                top: layout.titleTop,
                left: 0,
                right: layout.horizontal ? layout.rightContentWidth : 0,
                fontFamily: 'Inter, sans-serif',
                fontSize: layout.fontSize,
                fontWeight: 500,
                lineHeight: layout.fontSize === 18 ? '22px' : '18px',
                letterSpacing: layout.fontSize === 18 ? '-0.02em' : '-0.01em',
                color: textColor,
                display: '-webkit-box',
                WebkitLineClamp: layout.lineClamp,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
            }}>
                {title}
            </div>

            {/* Subtitle */}
            {subtitle && (
                <div style={{
                    position: 'absolute',
                    top: layout.subtitleTop,
                    left: 0,
                    right: layout.horizontal ? layout.rightContentWidth : 0,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: layout.subtitleFontSize || 12,
                    fontWeight: 400,
                    lineHeight: layout.subtitleFontSize === 14 ? '18px' : '16px',
                    color: subtitleColor,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {subtitle}
                </div>
            )}

            {/* Action Button */}
            {action && (
                <button style={{
                    position: 'absolute',
                    top: layout.actionTop,
                    left: 0,
                    minWidth: action.shape === 'pill' ? 70 : 66,
                    height: layout.actionFontSize === 14 ? 34 : 30,
                    borderRadius: action.borderRadius || (action.shape === 'pill' ? 23 : 8),
                    backgroundColor: action.color || '#4093ef',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: layout.actionFontSize || 12,
                    fontWeight: 600,
                    color: action.textColor || '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '0 12px',
                    pointerEvents: 'auto',
                }}>
                    <span>{action.label}</span>
                    {action.count !== undefined && (
                        <span style={{ fontWeight: 400, opacity: 0.8 }}>{action.count}</span>
                    )}
                </button>
            )}
        </div>
    )
}


// ============ Platform Icons (SVG Files) ============

// Map platform names to SVG file names in public/icons/social/
const PLATFORM_ICON_MAP: Record<string, string> = {
    instagram: 'instagram',
    twitter: 'twitter',
    tiktok: 'unknown', // No SVG available, fallback to unknown
    youtube: 'youtube',
    spotify: 'unknown', // No SVG available, fallback to unknown
    github: 'github',
    linkedin: 'linkedin',
    discord: 'discord',
    telegram: 'unknown', // No SVG available, fallback to unknown
    twitch: 'twitch',
    behance: 'behance',
    dribbble: 'dribbble',
    pinterest: 'pinterest',
    reddit: 'reddit',
    whatsapp: 'whatsapp',
    medium: 'medium',
    patreon: 'patreon',
    buymeacoffee: 'buymeacoffee',
    dev: 'dev',
    google: 'google',
    generic: 'unknown',
}

function getPlatformIconComponent(platform: string, iconSize: number = 40, customIcon?: string) {
    // If customIcon (favicon) is provided, use it
    if (customIcon) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image
                    src={customIcon}
                    alt={platform}
                    width={iconSize}
                    height={iconSize}
                    style={{
                        width: iconSize,
                        height: iconSize,
                        objectFit: 'contain',
                    }}
                    unoptimized // Allow external images
                    onError={(e) => {
                        // Fallback to default icon if favicon fails to load
                        const target = e.target as HTMLImageElement
                        const iconName = PLATFORM_ICON_MAP[platform] || PLATFORM_ICON_MAP.generic
                        target.src = `/icons/social/${iconName}.svg`
                    }}
                />
            </div>
        )
    }

    // Default: use platform SVG icon
    const iconName = PLATFORM_ICON_MAP[platform] || PLATFORM_ICON_MAP.generic
    const iconPath = `/icons/social/${iconName}.svg`

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image
                src={iconPath}
                alt={platform}
                width={iconSize}
                height={iconSize}
                style={{
                    width: iconSize,
                    height: iconSize,
                    objectFit: 'contain',
                }}
            />
        </div>
    )
}


// ============ Platform Configs ============

const PLATFORM_ACTIONS: Record<string, PlatformCardContentProps['action']> = {
    instagram: { label: 'Follow', color: '#4093ef', borderRadius: 8 },
    twitter: { label: 'Follow', color: '#4093ef', borderRadius: 8 },
    tiktok: { label: 'Follow', color: '#ea435a', borderRadius: 4 },
    youtube: { label: 'Subscribe', color: '#FF0000', shape: 'pill' },
    spotify: undefined,
    github: { label: 'Follow', color: '#24292e', borderRadius: 8 },
    linkedin: { label: 'Connect', color: '#0A66C2', borderRadius: 8 },
}

const PLATFORM_BACKGROUNDS: Record<string, string> = {
    instagram: '#ffffff',
    twitter: '#ffffff',
    tiktok: '#ffffff',
    youtube: '#FFF5F5',
    spotify: '#E6FBF0',
    github: '#ffffff',
    linkedin: '#F0F5FF',
    generic: '#ffffff',
}

const PLATFORM_ICON_BACKGROUNDS: Record<string, string> = {
    instagram: 'transparent', // SVG includes background
    twitter: '#55ACEE',      // Logo is white on blue, but our SVG might include blue? Checked twitter.svg
    tiktok: '#ffffff',
    youtube: 'transparent',   // SVG includes background
    spotify: '#1DB954',
    github: 'transparent',    // SVG includes background
    linkedin: 'transparent',  // SVG includes background
    discord: 'transparent',   // SVG includes background
    twitch: 'transparent',
    behance: 'transparent',
    dribbble: 'transparent',
    pinterest: 'transparent',
    reddit: 'transparent',
    whatsapp: 'transparent',
    medium: 'transparent',
    patreon: 'transparent',
    buymeacoffee: 'transparent',
    generic: '#6B7280',
}


// ============ Link Widget Component (uiverse cowardly-newt style) ============
// Rest: white/empty face + thin pink bottom bar (icon | CTA)
// Hover: pink panel expands up; media shrinks to top-left circle avatar;
//        title/subtitle live inside the expanded panel (revealed).

function stopAndGo(href?: string) {
    return (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        if (href) window.open(href, '_blank', 'noopener,noreferrer')
    }
}

export const LinkWidget: React.FC<WidgetProps<LinkWidgetConfig>> = ({
    config,
    onClick,
    isEditing = false,
}) => {
    const {
        url,
        size,
        platform: configPlatform,
        title,
        subtitle,
        ctaLabel,
        customColor,
        customIcon,
        iconUrl,
        menuBg,
        backgroundImage,
    } = config

    const [hovered, setHovered] = useState(false)

    const platform = configPlatform || extractPlatformInfo(url).platform
    const platformConfig = PLATFORM_REGISTRY[platform] || PLATFORM_REGISTRY.generic
    const displayTitle = title || platformConfig.name
    const displaySubtitle = subtitle
    // Card chrome (outer padding) — white like the reference
    const shellColor = '#ffffff'
    const panelColor = menuBg || '#fbb9b6'
    const mediaFallback = customColor || PLATFORM_BACKGROUNDS[platform] || '#f5f5f5'
    const iconTarget = iconUrl || url

    const defaultAction = PLATFORM_ACTIONS[platform]
    const action = ctaLabel
        ? { ...defaultAction, label: ctaLabel }
        : defaultAction
    const ctaText = action?.label || platformConfig.ctaLabel || 'Visit'
    const layout = getSizeLayout(size)
    const isBar = size === 'bar'

    // Reference: rest top≈80% (thin bar), hover top≈20% (full panel)
    const panelTop = isBar
        ? (hovered ? '0%' : '22%')
        : (hovered ? '20%' : '78%')

    // Avatar size scales with card
    const avatarSize = size === '2x2' ? 112 : size === '1x1' ? 72 : 88
    const avatarBorder = size === '2x2' ? 8 : 6

    const media = backgroundImage || null

    return (
        <BentoCard
            size={size}
            backgroundColor={shellColor}
            disableHover
            style={{ position: 'relative', overflow: 'hidden', padding: 3 }}
            onClick={isEditing ? onClick : undefined}
        >
            <div
                className="relative h-full w-full"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{ borderRadius: isBar ? 14 : 26 }}
            >
                {/* Media — full card at rest, circle avatar top-left on hover */}
                <div
                    className="absolute overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{
                        zIndex: hovered ? 3 : 1,
                        top: hovered ? 10 : 0,
                        left: hovered ? 10 : 0,
                        width: hovered ? avatarSize : '100%',
                        height: hovered ? avatarSize : '100%',
                        borderRadius: hovered ? '50%' : (isBar ? 14 : 26),
                        border: hovered ? `${avatarBorder}px solid ${panelColor}` : `0px solid ${panelColor}`,
                        boxShadow: hovered ? '0 5px 5px rgba(96,75,74,0.19)' : 'none',
                    }}
                >
                    {media ? (
                        <img
                            src={media}
                            alt=""
                            draggable={false}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div
                            className="h-full w-full"
                            style={{ background: mediaFallback }}
                        />
                    )}
                </div>

                {/* Bottom pink panel — expands on hover; holds title/subtitle + actions */}
                <div
                    className="absolute bottom-0 left-0 right-0 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.645,0.045,0.355,1)]"
                    style={{
                        zIndex: 2,
                        top: panelTop,
                        background: panelColor,
                        borderRadius: hovered
                            ? (isBar ? 14 : '48px 20px 26px 26px')
                            : (isBar ? 14 : '20px 20px 26px 26px'),
                        boxShadow: 'inset 0 5px 5px rgba(96,75,74,0.12)',
                    }}
                >
                    {/* Title / subtitle — clipped when bar is short, visible when expanded */}
                    <div
                        className="absolute left-5 right-5"
                        style={{
                            top: isBar ? 12 : '18%',
                            opacity: hovered ? 1 : 0,
                            transform: hovered ? 'translateY(0)' : 'translateY(8px)',
                            transition: 'opacity .35s ease .08s, transform .35s ease .08s',
                            pointerEvents: 'none',
                        }}
                    >
                        <div
                            className="font-semibold"
                            style={{
                                fontFamily: 'Inter, sans-serif',
                                fontSize: layout.fontSize === 18 ? 20 : 16,
                                lineHeight: layout.fontSize === 18 ? '24px' : '20px',
                                color: '#ffffff',
                                letterSpacing: '-0.02em',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {displayTitle}
                        </div>
                        {displaySubtitle && (
                            <div
                                className="mt-2"
                                style={{
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: layout.subtitleFontSize === 14 ? 14 : 13,
                                    lineHeight: '1.35',
                                    color: 'rgba(255,255,255,0.92)',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {displaySubtitle}
                            </div>
                        )}
                    </div>

                    {/* Bottom row: icon left, CTA right — always pinned to panel bottom */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 pb-3 sm:px-5 sm:pb-4">
                        <a
                            href={isEditing ? undefined : iconTarget}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={stopAndGo(isEditing ? undefined : iconTarget)}
                            className="flex size-9 items-center justify-center transition hover:scale-110"
                            style={{ pointerEvents: isEditing ? 'none' : 'auto' }}
                            aria-label={platformConfig.name}
                        >
                            <span className="flex size-6 items-center justify-center">
                                {getPlatformIconComponent(platform, 20, customIcon)}
                            </span>
                        </a>

                        <button
                            type="button"
                            onClick={stopAndGo(isEditing ? undefined : url)}
                            className="rounded-full bg-white px-3.5 py-1.5 text-[11px] font-semibold shadow-sm transition hover:bg-[#f55d56] hover:text-white sm:text-xs"
                            style={{ color: panelColor, pointerEvents: isEditing ? 'none' : 'auto' }}
                        >
                            {ctaText}
                        </button>
                    </div>
                </div>
            </div>
        </BentoCard>
    )
}

// ============ Exports ============

export { PlatformCardContent, getSizeLayout }

export function createLinkWidgetConfig(
    url: string,
    size: LinkWidgetConfig['size'] = '1x1',
    overrides?: Partial<LinkWidgetConfig>
): LinkWidgetConfig {
    const info = extractPlatformInfo(url)

    return {
        id: `link-${Date.now()}`,
        category: 'link',
        size,
        url,
        platform: info.platform,
        title: info.title,
        subtitle: info.subtitle,
        ctaLabel: info.ctaLabel,
        ...overrides,
    }
}

export default LinkWidget
