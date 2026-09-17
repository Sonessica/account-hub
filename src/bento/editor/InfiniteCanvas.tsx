'use client'

/**
 * Infinite bento canvas centered on a 1x4 search pill (uiverse spicy-ladybug style).
 * Pan freely in four directions; cards snap to grid cells.
 */

import React, { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { BENTO_GAP, BENTO_UNIT } from '@/bento/core/BentoSizeMap'
import { WidgetRenderer } from '@/bento/widgets'
import { WidgetEditOverlay } from '@/bento/editor'
import { WidgetEditorPanel } from '@/bento/editor'
import type { WidgetConfig, WidgetSize } from '@/bento/widgets/types'

const STEP = BENTO_UNIT + BENTO_GAP
const SEARCH_COLS = 4
const SEARCH_ROWS = 1

function sizeToSpan(size: WidgetSize) {
    if (size === 'bar') return { cols: 2, rows: 1 }
    const [cols, rows] = size.split('x').map(Number)
    return { cols: cols || 1, rows: rows || 1 }
}

function widgetPixelSize(size: WidgetSize) {
    const { cols, rows } = sizeToSpan(size)
    return {
        width: cols * BENTO_UNIT + (cols - 1) * BENTO_GAP,
        height: rows * BENTO_UNIT + (rows - 1) * BENTO_GAP,
    }
}

/** Cells occupied by search pill at origin */
function searchCells(): Set<string> {
    const s = new Set<string>()
    for (let dx = 0; dx < SEARCH_COLS; dx++) {
        for (let dy = 0; dy < SEARCH_ROWS; dy++) {
            s.add(`${dx},${dy}`)
        }
    }
    return s
}

/** Assign missing x,y in a spiral-ish grid around origin, skipping search footprint */
export function assignCanvasPositions(widgets: WidgetConfig[]): WidgetConfig[] {
    const occupied = searchCells()
    const out: WidgetConfig[] = []
    // Build candidate cells: rings around origin
    const cells: { x: number; y: number }[] = []
    const maxRing = 40
    for (let ring = 0; ring <= maxRing; ring++) {
        for (let x = -ring; x <= ring; x++) {
            for (let y = -ring; y <= ring; y++) {
                if (Math.max(Math.abs(x), Math.abs(y)) !== ring) continue
                cells.push({ x, y })
            }
        }
    }

    let ci = 0
    for (const w of widgets) {
        if (typeof w.x === 'number' && typeof w.y === 'number') {
            const span = sizeToSpan(w.size)
            for (let dx = 0; dx < span.cols; dx++) {
                for (let dy = 0; dy < span.rows; dy++) {
                    occupied.add(`${w.x + dx},${w.y + dy}`)
                }
            }
            out.push(w)
            continue
        }
        // find next free cell for 1x1; larger widgets need free block
        const span = sizeToSpan(w.size)
        let placed: { x: number; y: number } | null = null
        while (ci < cells.length) {
            const c = cells[ci++]
            let free = true
            for (let dx = 0; dx < span.cols && free; dx++) {
                for (let dy = 0; dy < span.rows; dy++) {
                    if (occupied.has(`${c.x + dx},${c.y + dy}`)) {
                        free = false
                        break
                    }
                }
            }
            if (free) {
                placed = c
                for (let dx = 0; dx < span.cols; dx++) {
                    for (let dy = 0; dy < span.rows; dy++) {
                        occupied.add(`${c.x + dx},${c.y + dy}`)
                    }
                }
                break
            }
        }
        if (!placed) {
            // overflow far bottom
            placed = { x: out.length % 20 - 10, y: 30 + Math.floor(out.length / 20) }
        }
        out.push({ ...w, x: placed.x, y: placed.y })
    }
    return out
}

function matchesQuery(w: WidgetConfig, q: string) {
    if (!q) return true
    const s = q.toLowerCase()
    const title = 'title' in w ? String((w as { title?: string }).title || '') : ''
    const url = 'url' in w ? String((w as { url?: string }).url || '') : ''
    const content = 'content' in w ? String((w as { content?: string }).content || '') : ''
    return `${title} ${url} ${content} ${w.category}`.toLowerCase().includes(s)
}

type CanvasProps = {
    widgets: WidgetConfig[]
    isEditing: boolean
    onWidgetsChange: (widgets: WidgetConfig[]) => void
    onUpdateWidget: (id: string, updates: Partial<WidgetConfig>) => void
    onRemoveWidget: (id: string) => void
    onSelect: (id: string | null) => void
    selectedWidgetId: string | null
    onOpenEdit: (id: string) => void
    editingWidgetId: string | null
}

export function InfiniteCanvas({
    widgets,
    isEditing,
    onWidgetsChange,
    onUpdateWidget,
    onRemoveWidget,
    onSelect,
    selectedWidgetId,
    onOpenEdit,
    editingWidgetId,
}: CanvasProps) {
    const viewportRef = useRef<HTMLDivElement>(null)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [query, setQuery] = useState('')
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const panDrag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
    const cardDrag = useRef<{
        id: string
        startX: number
        startY: number
        origX: number
        origY: number
        moved: boolean
    } | null>(null)
    const centeredOnce = useRef(false)

    // Smooth visual offset while dragging a card
    const dragX = useMotionValue(0)
    const dragY = useMotionValue(0)
    const smoothX = useSpring(dragX, { stiffness: 420, damping: 38, mass: 0.55 })
    const smoothY = useSpring(dragY, { stiffness: 420, damping: 38, mass: 0.55 })

    // Center search box on first paint
    useEffect(() => {
        const el = viewportRef.current
        if (!el || centeredOnce.current) return
        const rect = el.getBoundingClientRect()
        const searchW = SEARCH_COLS * BENTO_UNIT + (SEARCH_COLS - 1) * BENTO_GAP
        const searchH = SEARCH_ROWS * BENTO_UNIT
        setPan({
            x: rect.width / 2 - searchW / 2,
            y: rect.height / 2 - searchH / 2,
        })
        centeredOnce.current = true
    }, [])

    const onViewportPointerDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('[data-canvas-card]')) return
        if ((e.target as HTMLElement).closest('[data-canvas-search]')) return
        panDrag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        if (isEditing) onSelect(null)
    }

    const onViewportPointerMove = (e: React.PointerEvent) => {
        const p = panDrag.current
        if (p) {
            setPan({ x: p.panX + (e.clientX - p.x), y: p.panY + (e.clientY - p.y) })
            return
        }
        const c = cardDrag.current
        if (c && isEditing) {
            const dx = e.clientX - c.startX
            const dy = e.clientY - c.startY
            if (!c.moved && Math.abs(dx) + Math.abs(dy) > 8) {
                c.moved = true
                setDraggingId(c.id)
                ;(viewportRef.current as HTMLElement)?.setPointerCapture(e.pointerId)
            }
            if (c.moved) {
                dragX.set(dx)
                dragY.set(dy)
            }
        }
    }

    const onViewportPointerUp = () => {
        const c = cardDrag.current
        if (c && isEditing && c.moved) {
            const dx = dragX.get()
            const dy = dragY.get()
            const cellX = Math.round((c.origX * STEP + dx) / STEP)
            const cellY = Math.round((c.origY * STEP + dy) / STEP)
            onUpdateWidget(c.id, { x: cellX, y: cellY })
        }
        panDrag.current = null
        cardDrag.current = null
        setDraggingId(null)
        dragX.set(0)
        dragY.set(0)
    }

    const startCardDrag = (e: React.PointerEvent, w: WidgetConfig) => {
        if (!isEditing) return
        e.stopPropagation()
        const x = typeof w.x === 'number' ? w.x : 0
        const y = typeof w.y === 'number' ? w.y : 0
        cardDrag.current = { id: w.id, startX: e.clientX, startY: e.clientY, origX: x, origY: y, moved: false }
        dragX.set(0)
        dragY.set(0)
        // Capture so pointerup always hits the viewport handler
        ;(viewportRef.current as HTMLElement)?.setPointerCapture(e.pointerId)
        onSelect(w.id)
    }

    const editingWidget = widgets.find((w) => w.id === editingWidgetId) || null

    return (
        <div
            ref={viewportRef}
            className="relative h-[calc(100vh-4rem)] w-full cursor-grab overflow-hidden bg-[#F5F5F7] active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onPointerDown={onViewportPointerDown}
            onPointerMove={onViewportPointerMove}
            onPointerUp={onViewportPointerUp}
            onPointerCancel={onViewportPointerUp}
        >
            <div
                className="absolute left-0 top-0 will-change-transform"
                style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0)` }}
            >
                {/* Search pill — spicy-ladybug style, 1x4 at origin */}
                <div
                    data-canvas-search
                    className="absolute z-20 flex items-center"
                    style={{
                        left: 0,
                        top: 0,
                        width: SEARCH_COLS * BENTO_UNIT + (SEARCH_COLS - 1) * BENTO_GAP,
                        height: BENTO_UNIT,
                        padding: 16,
                    }}
                >
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search cards…"
                        className="atch-search-input h-full w-full"
                        onPointerDown={(e) => e.stopPropagation()}
                    />
                </div>

                {widgets.map((w) => {
                    const x = typeof w.x === 'number' ? w.x : 0
                    const y = typeof w.y === 'number' ? w.y : 0
                    const px = widgetPixelSize(w.size)
                    const hit = matchesQuery(w, query)
                    const isDragged = draggingId === w.id
                    return (
                        <motion.div
                            key={w.id}
                            data-canvas-card
                            className="absolute"
                            initial={false}
                            animate={{
                                left: x * STEP,
                                top: y * STEP,
                                width: px.width,
                                height: px.height,
                                opacity: hit ? 1 : 0.25,
                                scale: isDragged ? 1.045 : 1,
                                zIndex: isDragged ? 40 : 1,
                                boxShadow: isDragged
                                    ? '0 18px 40px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)'
                                    : '0 0px 0px rgba(0,0,0,0)',
                            }}
                            transition={{
                                type: 'spring',
                                stiffness: 380,
                                damping: 32,
                                mass: 0.6,
                                opacity: { duration: 0.18 },
                            }}
                            style={
                                isDragged
                                    ? { x: smoothX, y: smoothY, position: 'absolute' }
                                    : { position: 'absolute' }
                            }
                            onPointerDown={(e) => {
                                if (!isEditing) {
                                    e.stopPropagation()
                                    return
                                }
                                startCardDrag(e, w)
                            }}
                            onDoubleClick={(e) => {
                                e.stopPropagation()
                                if (isEditing) {
                                    onSelect(w.id)
                                    onOpenEdit(w.id)
                                }
                            }}
                        >
                            <div className="h-full w-full overflow-hidden rounded-[27px]">
                                <WidgetRenderer config={w} isEditing={isEditing} onConfigChange={(u) => onUpdateWidget(w.id, u)} />
                            </div>
                            {isEditing && selectedWidgetId === w.id && !editingWidgetId && !isDragged && (
                                <WidgetEditOverlay
                                    widget={w}
                                    onDelete={() => onRemoveWidget(w.id)}
                                    onSizeChange={(size) => onUpdateWidget(w.id, { size })}
                                    onUpdate={(u) => onUpdateWidget(w.id, u)}
                                />
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {isEditing && editingWidget && (
                <WidgetEditorPanel
                    widget={editingWidget}
                    onUpdate={(u) => onUpdateWidget(editingWidget.id, u)}
                    onClose={() => onOpenEdit('')}
                />
            )}

            <style>{`
                .atch-search-input {
                    border: none;
                    outline: none;
                    border-radius: 100px;
                    padding: 1.2em 1.6em;
                    background-color: #e1e2e3;
                    box-shadow: inset 2px 5px 10px rgba(0, 0, 0, 0.3);
                    transition: 300ms ease-in-out;
                    font-size: 16px;
                    color: #222;
                }
                .atch-search-input::placeholder { color: rgba(0,0,0,0.35); }
                .atch-search-input:focus {
                    background-color: #ffffff;
                    transform: scale(1.03);
                    box-shadow: 13px 13px 100px #969696, -13px -13px 100px #ffffff;
                }
            `}</style>
        </div>
    )
}

export default InfiniteCanvas
