'use client'

/**
 * Infinite bento canvas centered on a 1x4 search pill.
 * Pan freely; cards snap; drop on a card swaps positions.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { BENTO_GAP, BENTO_UNIT } from '@/bento/core/BentoSizeMap'
import { WidgetRenderer } from '@/bento/widgets'
import { WidgetEditOverlay } from '@/bento/editor'
import { WidgetEditorPanel } from '@/bento/editor'
import type { WidgetConfig, WidgetSize } from '@/bento/widgets/types'
import { WIDGET_SIZES } from '@/bento/widgets/types'

const STEP = BENTO_UNIT + BENTO_GAP
const SEARCH_COLS = 4
const SEARCH_ROWS = 1
const MAX_SPIRAL_RING = 48

function sizeToSpan(size: WidgetSize) {
  const meta = WIDGET_SIZES[size]
  if (!meta) return { cols: 1, rows: 1 }
  if (size === 'bar') return { cols: 2, rows: 1 }
  return { cols: meta.cols, rows: Math.max(1, Math.round(meta.rows)) }
}

function widgetArea(size: WidgetSize) {
  const { cols, rows } = sizeToSpan(size)
  return cols * rows
}

function widgetPixelSize(size: WidgetSize) {
  const meta = WIDGET_SIZES[size]
  if (meta) return { width: meta.width, height: meta.height }
  const { cols, rows } = sizeToSpan(size)
  return {
    width: cols * BENTO_UNIT + (cols - 1) * BENTO_GAP,
    height: rows * BENTO_UNIT + (rows - 1) * BENTO_GAP,
  }
}

function searchCells(): Set<string> {
  const s = new Set<string>()
  for (let dx = 0; dx < SEARCH_COLS; dx++) {
    for (let dy = 0; dy < SEARCH_ROWS; dy++) s.add(`${dx},${dy}`)
  }
  return s
}

function* spiralCells(
  from: { x: number; y: number } = { x: 0, y: 0 },
  reverse = false
): Generator<{ x: number; y: number }> {
  const sx = from.x
  const sy = from.y
  yield { x: sx, y: sy }
  for (let ring = 1; ; ring++) {
    const cells: { x: number; y: number }[] = []
    for (let x = sx - ring; x <= sx + ring; x++) cells.push({ x, y: sy - ring })
    for (let y = sy - ring + 1; y <= sy + ring; y++) cells.push({ x: sx + ring, y })
    for (let x = sx + ring - 1; x >= sx - ring; x--) cells.push({ x, y: sy + ring })
    for (let y = sy + ring - 1; y > sy - ring; y--) cells.push({ x: sx - ring, y })
    if (reverse) cells.reverse()
    for (const c of cells) yield c
  }
}

function blockIsFree(occupied: Set<string>, x: number, y: number, size: WidgetSize) {
  const { cols, rows } = sizeToSpan(size)
  for (let dx = 0; dx < cols; dx++) {
    for (let dy = 0; dy < rows; dy++) {
      if (occupied.has(`${x + dx},${y + dy}`)) return false
    }
  }
  return true
}

function reserveBlock(occupied: Set<string>, x: number, y: number, size: WidgetSize) {
  const { cols, rows } = sizeToSpan(size)
  for (let dx = 0; dx < cols; dx++) {
    for (let dy = 0; dy < rows; dy++) occupied.add(`${x + dx},${y + dy}`)
  }
}

function occupiedExcluding(widgets: WidgetConfig[], excludeIds: Set<string>) {
  const occupied = searchCells()
  for (const w of widgets) {
    if (excludeIds.has(w.id)) continue
    if (typeof w.x === 'number' && typeof w.y === 'number') {
      reserveBlock(occupied, w.x, w.y, w.size)
    }
  }
  return occupied
}

function placeFree(
  occupied: Set<string>,
  size: WidgetSize,
  origin: { x: number; y: number },
  reverse = false,
  skip = 0,
) {
  const gen = spiralCells(origin, reverse)
  for (let i = 0; i < skip; i++) gen.next()
  let guard = 0
  for (const cell of gen) {
    if (guard++ > 8000) break
    if (Math.max(Math.abs(cell.x - origin.x), Math.abs(cell.y - origin.y)) > MAX_SPIRAL_RING * 2) break
    if (blockIsFree(occupied, cell.x, cell.y, size)) {
      reserveBlock(occupied, cell.x, cell.y, size)
      return cell
    }
  }
  return null
}

export function findFreeDropPosition(widgets: WidgetConfig[], id: string, x: number, y: number) {
  const moving = widgets.find((widget) => widget.id === id)
  if (!moving) return { x, y }
  const occupied = occupiedExcluding(widgets, new Set([id]))
  const placed = placeFree(occupied, moving.size, { x, y })
  return placed || { x, y }
}

export function assignCanvasPositions(widgets: WidgetConfig[]): WidgetConfig[] {
  const occupied = searchCells()
  const pos = new Map<string, { x: number; y: number }>()
  const pending: WidgetConfig[] = []

  for (const w of widgets) {
    if (
      typeof w.x === 'number' &&
      typeof w.y === 'number' &&
      blockIsFree(occupied, w.x, w.y, w.size)
    ) {
      reserveBlock(occupied, w.x, w.y, w.size)
      pos.set(w.id, { x: w.x, y: w.y })
    } else {
      pending.push(w)
    }
  }

  // Large cards first so they do not leave unusable holes
  pending.sort((a, b) => widgetArea(b.size) - widgetArea(a.size))

  let fallbackIndex = 0
  for (const w of pending) {
    const cell =
      placeFree(occupied, w.size, { x: 0, y: 0 }, false, pending.length > 20 ? Math.floor(Math.random() * 4) : 0) ||
      placeFree(occupied, w.size, { x: 0, y: 0 }, true)
    if (cell) {
      pos.set(w.id, cell)
    } else {
      const fb = { x: (fallbackIndex % 24) - 12, y: MAX_SPIRAL_RING + Math.floor(fallbackIndex / 24) }
      fallbackIndex++
      reserveBlock(occupied, fb.x, fb.y, w.size)
      pos.set(w.id, fb)
    }
  }

  return widgets.map((w) => {
    const p = pos.get(w.id)
    return p ? { ...w, x: p.x, y: p.y } : { ...w, x: 0, y: 2 }
  })
}

export function autoLayoutFromCenter(widgets: WidgetConfig[]): WidgetConfig[] {
  const occupied = searchCells()
  const origin = {
    x: Math.floor(Math.random() * 7) - 3,
    y: Math.floor(Math.random() * 7) - 3,
  }
  const reverse = Math.random() < 0.5

  // Bigger cards first; shuffle within the same area for variation each click
  const order = [...widgets].sort((a, b) => {
    const da = widgetArea(b.size) - widgetArea(a.size)
    return da !== 0 ? da : Math.random() - 0.5
  })

  const pos = new Map<string, { x: number; y: number }>()
  let fallbackIndex = 0
  for (const w of order) {
    const cell = placeFree(occupied, w.size, origin, reverse)
    if (cell) {
      pos.set(w.id, cell)
    } else {
      const fb = { x: (fallbackIndex % 24) - 12, y: MAX_SPIRAL_RING + Math.floor(fallbackIndex / 24) }
      fallbackIndex++
      reserveBlock(occupied, fb.x, fb.y, w.size)
      pos.set(w.id, fb)
    }
  }

  return widgets.map((w) => {
    const p = pos.get(w.id)
    return { ...w, x: p!.x, y: p!.y }
  })
}

export type DropPlan =
  | { type: 'free'; x: number; y: number }
  | { type: 'swap'; swapId: string; x: number; y: number }
  | { type: 'push'; otherId: string; x: number; y: number; otherTo: { x: number; y: number } }

export function resolveDropTarget(widgets: WidgetConfig[], id: string, dropX: number, dropY: number): DropPlan {
  const moving = widgets.find((w) => w.id === id)
  if (!moving) return { type: 'free', x: dropX, y: dropY }
  const span = sizeToSpan(moving.size)
  const search = searchCells()

  let dropHitsSearch = false
  for (let dx = 0; dx < span.cols; dx++) {
    for (let dy = 0; dy < span.rows; dy++) {
      if (search.has(`${dropX + dx},${dropY + dy}`)) dropHitsSearch = true
    }
  }

  const votes = new Map<string, number>()
  for (const w of widgets) {
    if (w.id === id) continue
    const wx = typeof w.x === 'number' ? w.x : 0
    const wy = typeof w.y === 'number' ? w.y : 0
    const s = sizeToSpan(w.size)
    let hits = 0
    for (let dx = 0; dx < span.cols; dx++) {
      for (let dy = 0; dy < span.rows; dy++) {
        const cx = dropX + dx
        const cy = dropY + dy
        if (search.has(`${cx},${cy}`)) continue
        if (cx >= wx && cx < wx + s.cols && cy >= wy && cy < wy + s.rows) hits++
      }
    }
    if (hits > 0) votes.set(w.id, (votes.get(w.id) || 0) + hits)
  }

  if (votes.size === 0) {
    if (!dropHitsSearch) return { type: 'free', x: dropX, y: dropY }
    return { type: 'free', ...findFreeDropPosition(widgets, id, dropX, dropY) }
  }

  const otherId = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const other = widgets.find((w) => w.id === otherId)!
  const otherPos = {
    x: typeof other.x === 'number' ? other.x : 0,
    y: typeof other.y === 'number' ? other.y : 0,
  }
  const orig = {
    x: typeof moving.x === 'number' ? moving.x : 0,
    y: typeof moving.y === 'number' ? moving.y : 0,
  }

  // Swap only when each multi-cell block still fits at the other origin
  const excludeBoth = new Set([id, otherId])
  const swapOk =
    blockIsFree(occupiedExcluding(widgets, excludeBoth), otherPos.x, otherPos.y, moving.size) &&
    blockIsFree(occupiedExcluding(widgets, excludeBoth), orig.x, orig.y, other.size)

  if (swapOk && !dropHitsSearch) {
    return { type: 'swap', swapId: otherId, x: otherPos.x, y: otherPos.y }
  }

  // Push: relocate the overlapped card, then take the drop cell (if legal)
  if (!dropHitsSearch && blockIsFree(occupiedExcluding(widgets, excludeBoth), dropX, dropY, moving.size)) {
    const otherTo = placeFree(occupiedExcluding(widgets, excludeBoth), other.size, otherPos)
    if (otherTo) {
      return { type: 'push', otherId, x: dropX, y: dropY, otherTo }
    }
  }

  return { type: 'free', ...findFreeDropPosition(widgets, id, dropX, dropY) }
}

function matchesQuery(w: WidgetConfig, q: string) {
  if (!q) return true
  const s = q.toLowerCase()
  const title = 'title' in w ? String((w as { title?: string }).title || '') : ''
  const url = 'url' in w ? String((w as { url?: string }).url || '') : ''
  const content = 'content' in w ? String((w as { content?: string }).content || '') : ''
  return `${title} ${url} ${content} ${w.category}`.toLowerCase().includes(s)
}

function targetIsFormControl(target: EventTarget | null) {
  return !!(target as HTMLElement | null)?.closest?.(
    'input, textarea, select, button, [data-widget-overlay]'
  )
}

type CanvasProps = {
  widgets: WidgetConfig[]
  isEditing: boolean
  onUpdateWidget: (id: string, updates: Partial<WidgetConfig>) => void
  onRemoveWidget: (id: string) => void
  onSelect: (id: string | null) => void
  selectedWidgetId: string | null
  onOpenEdit: (id: string) => void
  editingWidgetId: string | null
  onDragStateChange?: (draggingId: string | null) => void
  onAutoLayout?: () => void
}

export function InfiniteCanvas({
  widgets,
  isEditing,
  onUpdateWidget,
  onRemoveWidget,
  onSelect,
  selectedWidgetId,
  onOpenEdit,
  editingWidgetId,
  onDragStateChange,
  onAutoLayout,
}: CanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [query, setQuery] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; title?: string } | null>(null)
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

  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const smoothX = useSpring(dragX, { stiffness: 420, damping: 38, mass: 0.55 })
  const smoothY = useSpring(dragY, { stiffness: 420, damping: 38, mass: 0.55 })

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

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const cullPan = useMemo(() => {
    const q = STEP / 2
    return { x: Math.round(pan.x / q) * q, y: Math.round(pan.y / q) * q }
  }, [pan.x, pan.y])

  const visibleWidgets = useMemo(() => {
    if (!viewportSize.width || !viewportSize.height) return []
    const overscan = STEP * 2
    return widgets.filter((w) => {
      if (w.id === selectedWidgetId || w.id === draggingId || w.id === editingWidgetId) return true
      const x = (typeof w.x === 'number' ? w.x : 0) * STEP + cullPan.x
      const y = (typeof w.y === 'number' ? w.y : 0) * STEP + cullPan.y
      const size = widgetPixelSize(w.size)
      return (
        x + size.width >= -overscan &&
        x <= viewportSize.width + overscan &&
        y + size.height >= -overscan &&
        y <= viewportSize.height + overscan
      )
    })
  }, [widgets, selectedWidgetId, draggingId, editingWidgetId, cullPan, viewportSize])

  const onViewportPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-canvas-card]')) return
    if ((e.target as HTMLElement).closest('[data-canvas-search]')) return
    if ((e.target as HTMLElement).closest('[data-canvas-chrome]')) return
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
        onDragStateChange?.(c.id)
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
      const drop = resolveDropTarget(widgets, c.id, cellX, cellY)
      if (drop.type === 'swap') {
        onUpdateWidget(c.id, { x: drop.x, y: drop.y })
        onUpdateWidget(drop.swapId, { x: c.origX, y: c.origY })
      } else if (drop.type === 'push') {
        onUpdateWidget(drop.otherId, { x: drop.otherTo.x, y: drop.otherTo.y })
        onUpdateWidget(c.id, { x: drop.x, y: drop.y })
      } else {
        onUpdateWidget(c.id, { x: drop.x, y: drop.y })
      }
    }
    panDrag.current = null
    cardDrag.current = null
    setDraggingId(null)
    onDragStateChange?.(null)
    dragX.set(0)
    dragY.set(0)
  }

  const startCardDrag = (e: React.PointerEvent, w: WidgetConfig) => {
    if (!isEditing || e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return
    if (target.closest('[data-widget-overlay]')) return
    const x = typeof w.x === 'number' ? w.x : 0
    const y = typeof w.y === 'number' ? w.y : 0
    cardDrag.current = {
      id: w.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: x,
      origY: y,
      moved: false,
    }
    dragX.set(0)
    dragY.set(0)
    e.preventDefault()
    onSelect(w.id)
  }

  const editingWidget = widgets.find((w) => w.id === editingWidgetId) || null

  return (
    <div
      ref={viewportRef}
      className="relative h-[calc(100vh-4rem)] w-full cursor-grab overflow-hidden bg-[#F5F5F7] active:cursor-grabbing"
      style={{ touchAction: 'none' }}
      onPointerDown={onViewportPointerDown}
      onPointerMoveCapture={onViewportPointerMove}
      onPointerUpCapture={onViewportPointerUp}
      onPointerCancelCapture={onViewportPointerUp}
    >
      <div
        className="absolute left-0 top-0 will-change-transform"
        style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0)` }}
      >
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
            placeholder="Search cards..."
            className="atch-search-input h-full w-full"
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>

        {visibleWidgets.map((w) => {
          const x = typeof w.x === 'number' ? w.x : 0
          const y = typeof w.y === 'number' ? w.y : 0
          const px = widgetPixelSize(w.size)
          const hit = matchesQuery(w, query)
          const isDragged = draggingId === w.id
          const imageSrc =
            w.category === 'image' ? String((w as { src?: string }).src || '') : ''
          return (
            <motion.div
              key={w.id}
              id={`widget-${w.id}`}
              data-canvas-card
              onDragStart={(e) => e.preventDefault()}
              className="absolute cursor-pointer select-none"
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
                  ? { x: smoothX, y: smoothY, position: 'absolute', userSelect: 'none' }
                  : { position: 'absolute', userSelect: 'none' }
              }
              onPointerDownCapture={(e) => {
                if (!isEditing) return
                startCardDrag(e, w)
              }}
              onDoubleClickCapture={(e) => {
                if (targetIsFormControl(e.target)) return
                if (isEditing) {
                  onSelect(w.id)
                  onOpenEdit(w.id)
                  return
                }
                if (w.category === 'image' && imageSrc) {
                  setLightbox({
                    src: imageSrc,
                    title: 'title' in w ? String((w as { title?: string }).title || '') : undefined,
                  })
                }
              }}
            >
              <div
                data-canvas-card-content
                className="h-full w-full overflow-hidden rounded-[27px]"
                style={{ pointerEvents: 'none' }}
              >
                <WidgetRenderer
                  config={w}
                  isEditing={isEditing}
                  onConfigChange={(u) => onUpdateWidget(w.id, u)}
                />
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

      {onAutoLayout && null}

      {lightbox && (
        <div
          data-canvas-chrome
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-full max-w-5xl">
            {lightbox.title && (
              <div className="mb-3 text-center text-sm text-white/80">{lightbox.title}</div>
            )}
            <img
              src={lightbox.src}
              alt={lightbox.title || ''}
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              className="absolute -right-2 -top-10 text-2xl text-white/80 hover:text-white"
              onClick={() => setLightbox(null)}
              aria-label="close"
            >
              x
            </button>
          </div>
        </div>
      )}

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
        [data-canvas-card] img {
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
        }
      `}</style>
    </div>
  )
}

export default InfiniteCanvas
