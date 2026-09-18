'use client'

/**
 * Infinite bento canvas centered on a 1x4 search pill.
 * Pan freely; full-footprint placement handles swaps and multi-card pushes.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import { BENTO_GAP, BENTO_UNIT } from '@/bento/core/BentoSizeMap'
import { WidgetRenderer } from '@/bento/widgets'
import { WidgetEditOverlay } from '@/bento/editor'
import { WidgetEditorPanel } from '@/bento/editor'
import type { GalleryImage, ImageWidgetConfig, WidgetConfig, WidgetSize } from '@/bento/widgets/types'
import { WIDGET_SIZES } from '@/bento/widgets/types'
import { resolveCanvasDrop, resolveCanvasResize, SEARCH_COLS, SEARCH_ROWS } from './canvasPlacement'
import { normalizeImageGallery, resolveCoverIndex } from '@/bento/widgets/image/gallery'

const STEP = BENTO_UNIT + BENTO_GAP

function widgetPixelSize(size: WidgetSize) {
  const meta = WIDGET_SIZES[size]
  if (meta) return { width: meta.width, height: meta.height }
  return { width: BENTO_UNIT, height: BENTO_UNIT }
}

export { assignCanvasPositions, autoLayoutFromCenter } from './canvasPlacement'

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
  onWidgetsChange?: (widgets: WidgetConfig[]) => void
  centerVersion?: number
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
  onWidgetsChange,
  centerVersion = 0,
}: CanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [query, setQuery] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{
    widgetId: string
    index: number
  } | null>(null)
  const panDrag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const cardDrag = useRef<{
    id: string
    startX: number
    startY: number
    origX: number
    origY: number
    moved: boolean
  } | null>(null)
  const centeredVersion = useRef<number | null>(null)

  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const smoothX = useSpring(dragX, { stiffness: 420, damping: 38, mass: 0.55 })
  const smoothY = useSpring(dragY, { stiffness: 420, damping: 38, mass: 0.55 })

  useEffect(() => {
    const el = viewportRef.current
    if (!el || centeredVersion.current === centerVersion) return
    const rect = el.getBoundingClientRect()
    const searchW = SEARCH_COLS * BENTO_UNIT + (SEARCH_COLS - 1) * BENTO_GAP
    const searchH = SEARCH_ROWS * BENTO_UNIT
    setPan({
      x: rect.width / 2 - searchW / 2,
      y: rect.height / 2 - searchH / 2,
    })
    centeredVersion.current = centerVersion
  }, [centerVersion])

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
      if (w.id === selectedWidgetId || w.id === draggingId || w.id === editingWidgetId || w.id === lightbox?.widgetId) return true
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
  }, [widgets, selectedWidgetId, draggingId, editingWidgetId, lightbox?.widgetId, cullPan, viewportSize])

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
      const next = resolveCanvasDrop(widgets, c.id, cellX, cellY)
      const changed = next.some((widget, index) => widget.x !== widgets[index].x || widget.y !== widgets[index].y)
      if (changed && onWidgetsChange) onWidgetsChange(next)
      else if (changed) {
        for (const widget of next) {
          const before = widgets.find((item) => item.id === widget.id)
          if (before && (before.x !== widget.x || before.y !== widget.y)) {
            onUpdateWidget(widget.id, { x: widget.x, y: widget.y })
          }
        }
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

  const lightboxWidget = lightbox
    ? widgets.find((w) => w.id === lightbox.widgetId && w.category === 'image')
    : null
  const lightboxGallery = lightboxWidget
    ? normalizeImageGallery(lightboxWidget as ImageWidgetConfig)
    : null
  const lightboxImages: GalleryImage[] = lightboxGallery?.images ?? []
  const lightboxIndex = lightboxImages.length
    ? Math.min(Math.max(lightbox?.index ?? 0, 0), lightboxImages.length - 1)
    : 0
  const lightboxImage = lightboxImages[lightboxIndex] || null
  const lightboxTitle = lightboxWidget
    ? String((lightboxWidget as ImageWidgetConfig).title || '')
    : ''
  const lightboxRef = useRef<HTMLDivElement | null>(null)

  const stepLightbox = (delta: number) => {
    if (!lightboxImages.length) return
    setLightbox((prev) => {
      if (!prev) return prev
      const len = lightboxImages.length
      return { ...prev, index: ((prev.index + delta) % len + len) % len }
    })
  }

  useEffect(() => {
    if (!lightbox) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightbox(null)
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        stepLightbox(-1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        stepLightbox(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, lightboxImages.length])

  useEffect(() => {
    if (!lightbox) return
    const el = lightboxRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      stepLightbox(delta > 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, lightboxImages.length, lightboxIndex])

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
          const gallery =
            w.category === 'image'
              ? normalizeImageGallery(w as ImageWidgetConfig)
              : null
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
                if (w.category === 'image' && gallery && gallery.images.length > 0) {
                  const start = resolveCoverIndex(w as ImageWidgetConfig)
                  setLightbox({ widgetId: w.id, index: start })
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
                  onSizeChange={(size) => {
                    const next = resolveCanvasResize(widgets, w.id, size)
                    if (onWidgetsChange) onWidgetsChange(next)
                    else {
                      for (const widget of next) {
                        const before = widgets.find((item) => item.id === widget.id)
                        if (before && (before.size !== widget.size || before.x !== widget.x || before.y !== widget.y)) {
                          onUpdateWidget(widget.id, { size: widget.size, x: widget.x, y: widget.y })
                        }
                      }
                    }
                  }}
                  onUpdate={(u) => onUpdateWidget(w.id, u)}
                />
              )}
            </motion.div>
          )
        })}
      </div>

      {onAutoLayout && null}

      <AnimatePresence>
        {lightbox && lightboxImage && (
          <motion.div
            ref={lightboxRef}
            data-canvas-chrome
            className="fixed inset-0 z-[100000] flex flex-col items-center justify-center gap-4 bg-black/70 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label="图片预览"
          >
            <motion.div
              className="relative flex max-h-full max-w-5xl flex-col items-center"
              initial={{ scale: 0.72, opacity: 0, y: 28 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.86, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18, mass: 0.7 }}
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxTitle && (
                <motion.div
                  className="mb-3 text-center text-sm font-medium text-white/90"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 20 }}
                >
                  {lightboxTitle}
                </motion.div>
              )}

              <motion.img
                key={lightboxImage.id}
                src={lightboxImage.src}
                alt={lightboxImage.alt || lightboxTitle || ''}
                className="max-h-[70vh] w-auto max-w-full rounded-[28px] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/20"
                initial={{ opacity: 0.65, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              />

              <div className="mt-2 text-xs text-white/55">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            </motion.div>

            {lightboxImages.length > 1 && (
              <div
                className="max-w-[min(96vw,900px)] overflow-x-auto rounded-2xl bg-black/25 px-3 py-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  {lightboxImages.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      aria-label={`查看第 ${index + 1} 张`}
                      className={[
                        'h-14 w-14 shrink-0 overflow-hidden rounded-xl transition',
                        index === lightboxIndex
                          ? 'ring-2 ring-white scale-105'
                          : 'opacity-70 ring-1 ring-white/20 hover:opacity-100',
                      ].join(' ')}
                      onClick={() => setLightbox({ widgetId: lightbox.widgetId, index })}
                    >
                      <img
                        src={image.src}
                        alt=""
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
