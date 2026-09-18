import type { WidgetConfig, WidgetSize } from '../widgets/types'

export const SEARCH_COLS = 4
export const SEARCH_ROWS = 1

type Point = { x: number; y: number }
type Span = { cols: number; rows: number }

// A bar is visually short, but it reserves a full row so no card can occupy
// the same grid cells. Keep this mapping in sync with WidgetSize.
const SPANS: Record<WidgetSize, Span> = {
  '1x1': { cols: 1, rows: 1 },
  '2x1': { cols: 2, rows: 1 },
  '1x2': { cols: 1, rows: 2 },
  '2x2': { cols: 2, rows: 2 },
  bar: { cols: 2, rows: 1 },
}

const key = (x: number, y: number) => `${x},${y}`
const pointOf = (widget: WidgetConfig): Point => ({ x: widget.x!, y: widget.y! })
const hasPoint = (widget: WidgetConfig) => Number.isSafeInteger(widget.x) && Number.isSafeInteger(widget.y)
const area = (widget: WidgetConfig) => SPANS[widget.size].cols * SPANS[widget.size].rows

function searchCells() {
  const occupied = new Set<string>()
  for (let x = 0; x < SEARCH_COLS; x++) {
    for (let y = 0; y < SEARCH_ROWS; y++) occupied.add(key(x, y))
  }
  return occupied
}

function forEachCell(point: Point, size: WidgetSize, visit: (x: number, y: number) => void) {
  const { cols, rows } = SPANS[size]
  for (let dx = 0; dx < cols; dx++) {
    for (let dy = 0; dy < rows; dy++) visit(point.x + dx, point.y + dy)
  }
}

function isFree(occupied: Set<string>, point: Point, size: WidgetSize) {
  let free = true
  forEachCell(point, size, (x, y) => {
    if (occupied.has(key(x, y))) free = false
  })
  return free
}

function reserve(occupied: Set<string>, point: Point, size: WidgetSize) {
  forEachCell(point, size, (x, y) => occupied.add(key(x, y)))
}

function occupiedBy(widgets: WidgetConfig[], excluded: Set<string> = new Set()) {
  const occupied = searchCells()
  for (const widget of widgets) {
    if (!excluded.has(widget.id) && hasPoint(widget)) reserve(occupied, pointOf(widget), widget.size)
  }
  return occupied
}

function* spiral(origin: Point, reverse = false): Generator<Point> {
  yield origin
  for (let radius = 1; ; radius++) {
    const ring: Point[] = []
    for (let x = origin.x - radius; x <= origin.x + radius; x++) ring.push({ x, y: origin.y - radius })
    for (let y = origin.y - radius + 1; y <= origin.y + radius; y++) ring.push({ x: origin.x + radius, y })
    for (let x = origin.x + radius - 1; x >= origin.x - radius; x--) ring.push({ x, y: origin.y + radius })
    for (let y = origin.y + radius - 1; y > origin.y - radius; y--) ring.push({ x: origin.x - radius, y })
    if (reverse) ring.reverse()
    yield* ring
  }
}

// The canvas is unbounded. With finitely many cards, the spiral always finds
// a free rectangle; returning an unchecked fallback would reintroduce overlap.
function firstFree(occupied: Set<string>, size: WidgetSize, origin: Point, reverse = false) {
  for (const point of spiral(origin, reverse)) {
    if (isFree(occupied, point, size)) {
      reserve(occupied, point, size)
      return point
    }
  }
  throw new Error('Unreachable: the infinite canvas has no free cells')
}

export function isValidCanvasLayout(widgets: WidgetConfig[]) {
  const occupied = searchCells()
  for (const widget of widgets) {
    if (!hasPoint(widget) || !isFree(occupied, pointOf(widget), widget.size)) return false
    reserve(occupied, pointOf(widget), widget.size)
  }
  return true
}

export function assignCanvasPositions(widgets: WidgetConfig[]): WidgetConfig[] {
  const occupied = searchCells()
  const positions = new Map<string, Point>()
  const pending: WidgetConfig[] = []

  for (const widget of widgets) {
    if (hasPoint(widget) && isFree(occupied, pointOf(widget), widget.size)) {
      positions.set(widget.id, pointOf(widget))
      reserve(occupied, pointOf(widget), widget.size)
    } else pending.push(widget)
  }

  // Place large rectangles first, but return cards in their original order.
  pending.sort((a, b) => area(b) - area(a))
  for (const widget of pending) positions.set(widget.id, firstFree(occupied, widget.size, { x: 0, y: 0 }))
  return widgets.map((widget) => ({ ...widget, ...positions.get(widget.id)! }))
}

export function autoLayoutFromCenter(widgets: WidgetConfig[]): WidgetConfig[] {
  const occupied = searchCells()
  const origin = { x: Math.floor(Math.random() * 13) - 6, y: Math.floor(Math.random() * 13) - 6 }
  const reverse = Math.random() < 0.5
  const order = widgets.map((widget) => ({ widget, tie: Math.random() }))
    .sort((a, b) => area(b.widget) - area(a.widget) || a.tie - b.tie)
  const positions = new Map<string, Point>()
  for (const { widget } of order) positions.set(widget.id, firstFree(occupied, widget.size, origin, reverse))
  return widgets.map((widget) => ({ ...widget, ...positions.get(widget.id)! }))
}

function overlaps(point: Point, size: WidgetSize, other: WidgetConfig) {
  const span = SPANS[size]
  const otherSpan = SPANS[other.size]
  return point.x < other.x! + otherSpan.cols && point.x + span.cols > other.x! &&
    point.y < other.y! + otherSpan.rows && point.y + span.rows > other.y!
}

function withPositions(widgets: WidgetConfig[], positions: Map<string, Point>) {
  return widgets.map((widget) => {
    const point = positions.get(widget.id)
    return point ? { ...widget, ...point } : widget
  })
}

export function resolveCanvasDrop(widgets: WidgetConfig[], id: string, x: number, y: number): WidgetConfig[] {
  // Repair any pre-existing overlap before planning the drop. Every returned
  // layout is checked as a whole, including the search bar and all card cells.
  const placed = isValidCanvasLayout(widgets) ? widgets : assignCanvasPositions(widgets)
  const moving = placed.find((widget) => widget.id === id)
  if (!moving) return placed

  const target = { x: Math.round(x), y: Math.round(y) }
  const others = placed.filter((widget) => widget.id !== id)
  const blockers = others.filter((widget) => overlaps(target, moving.size, widget))
  const searchHit = !isFree(searchCells(), target, moving.size)

  if (!searchHit && blockers.length === 0) {
    return withPositions(placed, new Map([[id, target]]))
  }

  // Swap only when the pointer lands on the other card's origin AND both
  // resulting rectangles fit. Checking the full trial also catches overlap
  // between the swapped cards when their old/new footprints intersect.
  if (!searchHit && blockers.length === 1) {
    const other = blockers[0]
    if (target.x === other.x && target.y === other.y) {
      const swapped = withPositions(placed, new Map([
        [id, target], [other.id, pointOf(moving)],
      ]))
      if (isValidCanvasLayout(swapped)) return swapped
    }
  }

  if (!searchHit) {
    // Remove every direct blocker atomically, reserve the complete moving
    // footprint, then place blockers one by one in verified free rectangles.
    const excluded = new Set([id, ...blockers.map((widget) => widget.id)])
    const occupied = occupiedBy(placed, excluded)
    if (isFree(occupied, target, moving.size)) {
      reserve(occupied, target, moving.size)
      const positions = new Map<string, Point>([[id, target]])
      for (const blocker of [...blockers].sort((a, b) => area(b) - area(a))) {
        positions.set(blocker.id, firstFree(occupied, blocker.size, pointOf(blocker)))
      }
      const pushed = withPositions(placed, positions)
      if (isValidCanvasLayout(pushed)) return pushed
    }
  }

  // Search-bar collisions (or an unexpected invalid plan) use the nearest
  // checked free rectangle. Never return the unchecked drop coordinates.
  const occupied = occupiedBy(placed, new Set([id]))
  const fallback = firstFree(occupied, moving.size, target)
  return withPositions(placed, new Map([[id, fallback]]))
}
