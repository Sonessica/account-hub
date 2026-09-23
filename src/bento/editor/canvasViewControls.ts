/**
 * Shared canvas zoom controls for InfiniteCanvas + SettingsModal
 */

export type ZoomInput = number | ((prev: number) => number)

export const ZOOM_MIN = 0.35
export const ZOOM_MAX = 1.8

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))
}

let currentZoom = 1
let applyZoom: ((z: ZoomInput) => void) | null = null
let applyRecenter: (() => void) | null = null
const listeners = new Set<() => void>()

export function getCanvasZoom() {
  return currentZoom
}

export function subscribeCanvasZoom(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function publishCanvasZoom(zoom: number) {
  currentZoom = zoom
  listeners.forEach((listener) => listener())
}

export function bindCanvasZoom(fn: (z: ZoomInput) => void) {
  applyZoom = fn
}

export function unbindCanvasZoom() {
  applyZoom = null
}

export function bindCanvasRecenter(fn: () => void) {
  applyRecenter = fn
}

export function unbindCanvasRecenter() {
  applyRecenter = null
}

export function setCanvasZoom(zoom: ZoomInput) {
  applyZoom?.(zoom)
}

export function recenterCanvas() {
  applyRecenter?.()
}

export function resetCanvasView(defaultZoom = 1) {
  applyZoom?.(defaultZoom)
  applyRecenter?.()
}

export function stepCanvasZoom(direction: 1 | -1) {
  applyZoom?.((prev) => clampZoom(prev + direction * 0.1))
}

export { clampZoom }
