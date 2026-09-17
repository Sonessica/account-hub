'use client'

/**
 * [INPUT]: (config: MapWidgetConfig, onClick?: () => void, isEditing?: boolean, onConfigChange?: (updates) => void) - Map widget configuration, optional click handler, editing state, config change callback
 * [OUTPUT]: React component - Static map widget using mapcn with MapLibre GL, displays location with marker. All map interactions (drag, zoom, etc.) are permanently disabled.
 * [POS]: Map widget component in bento/widgets/map, renders static map using mapcn library within BentoCard container, all mouse interactions are disabled for both edit and non-edit modes
 * 
 * [PROTOCOL]:
 * 1. Once this file's logic changes, this Header must be synchronized immediately.
 * 2. After update, must check upward whether the parent folder's .folder.md description is still accurate.
 */

import React, { useMemo, useEffect } from 'react'
import type { StyleSpecification } from 'maplibre-gl'
import { BentoCard } from '@/bento/core'
import { Card } from '@/design-system/patterns/Card'
import { Map, MapMarker, MarkerContent, useMap } from '@/components/ui/map'
import type { MapWidgetConfig, WidgetProps } from '../types'

const CARTO_LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const CARTO_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const SATELLITE_STYLE: StyleSpecification = {
    version: 8,
    sources: {
        satellite: {
            type: 'raster',
            tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri, Maxar, Earthstar Geographics',
        },
    },
    layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
}

function stylesForConfig(style?: MapWidgetConfig['style']) {
    if (style === 'dark') {
        return { light: CARTO_DARK, dark: CARTO_DARK }
    }
    if (style === 'satellite') {
        return { light: SATELLITE_STYLE, dark: SATELLITE_STYLE }
    }
    return undefined
}

// ============ Map Widget Component ============

// Internal component: disable interactions only; view sync lives in Map
const MapContent: React.FC<{
    location?: MapWidgetConfig['location']
    zoom?: number
    isEditing: boolean
    onConfigChange?: (updates: Partial<MapWidgetConfig>) => void
    config: MapWidgetConfig
}> = () => {
    const { map, isLoaded } = useMap()

    useEffect(() => {
        if (!map || !isLoaded) return
        map.dragPan.disable()
        map.scrollZoom.disable()
        map.boxZoom.disable()
        map.dragRotate.disable()
        map.keyboard.disable()
        map.doubleClickZoom.disable()
        map.touchZoomRotate.disable()
    }, [map, isLoaded])

    return null
}

export const MapWidget: React.FC<WidgetProps<MapWidgetConfig>> = ({
    config,
    onClick,
    isEditing = false,
    onConfigChange,
}) => {
    const { title, location, size, zoom, style } = config

    // Convert location from {lat, lng} to [lng, lat] format for mapcn
    const mapCenter = useMemo<[number, number] | undefined>(() => {
        if (!location) return undefined
        return [location.lng, location.lat]
    }, [location])

    // Default center (San Francisco) if no location provided
    const defaultCenter: [number, number] = [-122.4194, 37.7749]
    const center = mapCenter || defaultCenter
    const mapZoom = zoom ?? 11 // Use config zoom or default
    const mapStyles = useMemo(() => stylesForConfig(style), [style])

    return (
        <BentoCard
            size={size}
            clickable={!isEditing}
            onClick={onClick}
        >
                {/* Map container with Card wrapper */}
                <Card
                    className="h-full w-full overflow-hidden"
                    rounded="lg"
                    padding="none"
                    style={{ 
                        height: '100%', 
                        width: '100%', 
                        position: 'relative'
                    }}
                >
                <Map center={center} zoom={mapZoom} interactive={false} styles={mapStyles}>
                    <MapContent
                        location={location}
                        zoom={zoom}
                        isEditing={isEditing}
                        onConfigChange={onConfigChange}
                        config={config}
                    />
                    {Number.isFinite(location?.lat) && Number.isFinite(location?.lng) && (
                        <MapMarker longitude={location!.lng} latitude={location!.lat} draggable={false}>
                            <MarkerContent>
                                <div style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    backgroundColor: '#5871FF',
                                    border: '3px solid white',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                                }} />
                            </MarkerContent>
                        </MapMarker>
                    )}
                </Map>

                {/* 标签 (Figma 风格玻璃态按钮) - 优先显示 location.label，如果没有则显示 title */}
                {(location?.label || title) && (
                    <div style={{
                        position: 'absolute',
                        bottom: 20,
                        left: 20,
                        height: 38,
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(20px) saturate(160%)',
                        padding: '0 16px',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05)',
                        pointerEvents: 'none',
                        zIndex: 10,
                    }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>🏡</span>
                        <span style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#000',
                            letterSpacing: '-0.01em'
                        }}>
                            {location?.label || title}
                        </span>
                    </div>
                )}
            </Card>
        </BentoCard>
    )
}

// ============ 创建 MapWidgetConfig ============

export function createMapWidgetConfig(
    title: string = 'Where I live',
    size: MapWidgetConfig['size'] = '2x2',
    location?: MapWidgetConfig['location'],
    zoom?: number
): MapWidgetConfig {
    return {
        id: `map-${Date.now()}`,
        category: 'map',
        size,
        title,
        location,
        zoom,
    }
}

export default MapWidget
