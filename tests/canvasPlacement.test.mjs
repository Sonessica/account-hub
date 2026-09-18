import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assignCanvasPositions,
  autoLayoutFromCenter,
  isValidCanvasLayout,
  resolveCanvasDrop,
} from '../src/bento/editor/canvasPlacement.ts'

const card = (id, size, x, y) => ({ id, category: 'image', src: '', size, x, y })
const at = (widgets, id) => {
  const widget = widgets.find((item) => item.id === id)
  return { x: widget.x, y: widget.y }
}

test('2x1 displaces both 1x1 cards under its full footprint', () => {
  const widgets = [card('wide', '2x1', -3, 2), card('a', '1x1', 0, 2), card('b', '1x1', 1, 2)]
  const next = resolveCanvasDrop(widgets, 'wide', 0, 2)
  assert.deepEqual(at(next, 'wide'), { x: 0, y: 2 })
  assert.notDeepEqual(at(next, 'a'), at(widgets, 'a'))
  assert.notDeepEqual(at(next, 'b'), at(widgets, 'b'))
  assert.equal(isValidCanvasLayout(next), true)
})

test('1x2 displaces both vertically stacked 1x1 cards', () => {
  const widgets = [card('tall', '1x2', -3, 1), card('a', '1x1', 5, 1), card('b', '1x1', 5, 2)]
  const next = resolveCanvasDrop(widgets, 'tall', 5, 1)
  assert.deepEqual(at(next, 'tall'), { x: 5, y: 1 })
  assert.notDeepEqual(at(next, 'a'), at(widgets, 'a'))
  assert.notDeepEqual(at(next, 'b'), at(widgets, 'b'))
  assert.equal(isValidCanvasLayout(next), true)
})

test('mixed multi-cell blockers are pushed without overlapping each other', () => {
  const widgets = [
    card('large', '2x2', -3, 2),
    card('wide', '2x1', 6, 1),
    card('tall', '1x2', 7, 2),
    card('small', '1x1', 6, 2),
    card('neighbor', '2x2', 9, 1),
  ]
  const next = resolveCanvasDrop(widgets, 'large', 6, 1)
  assert.deepEqual(at(next, 'large'), { x: 6, y: 1 })
  assert.deepEqual(at(next, 'neighbor'), at(widgets, 'neighbor'))
  assert.equal(isValidCanvasLayout(next), true)
})

test('an unequal-size swap cannot overlap the two moved rectangles', () => {
  const widgets = [card('small', '1x1', 5, 2), card('large', '2x2', 6, 2)]
  const next = resolveCanvasDrop(widgets, 'small', 6, 2)
  assert.deepEqual(at(next, 'small'), { x: 6, y: 2 })
  assert.equal(isValidCanvasLayout(next), true)
})

test('two 1x1 cards exchange positions without moving neighbors', () => {
  const widgets = [card('a', '1x1', 5, 2), card('b', '1x1', 6, 2), card('neighbor', '1x1', 7, 2)]
  const next = resolveCanvasDrop(widgets, 'a', 6, 2)
  assert.deepEqual(at(next, 'a'), { x: 6, y: 2 })
  assert.deepEqual(at(next, 'b'), { x: 5, y: 2 })
  assert.deepEqual(at(next, 'neighbor'), { x: 7, y: 2 })
  assert.equal(isValidCanvasLayout(next), true)
})

test('bar reserves its entire two-cell width while being pushed', () => {
  const widgets = [card('moving', '1x2', -3, 2), card('bar', 'bar', 6, 2), card('neighbor', '1x1', 6, 3)]
  const next = resolveCanvasDrop(widgets, 'moving', 6, 2)
  assert.deepEqual(at(next, 'moving'), { x: 6, y: 2 })
  assert.equal(isValidCanvasLayout(next), true)
})

test('drop on the search pill lands in a checked free rectangle', () => {
  const widgets = [card('wide', '2x1', -3, 2), card('near', '2x2', 4, 0)]
  const next = resolveCanvasDrop(widgets, 'wide', 3, 0)
  assert.notDeepEqual(at(next, 'wide'), { x: 3, y: 0 })
  assert.equal(isValidCanvasLayout(next), true)
})

test('pre-existing overlap is repaired before planning the new drop', () => {
  const widgets = [
    card('moving', '2x1', -3, 2),
    card('a', '2x2', 6, 2),
    card('b', '1x1', 7, 3),
  ]
  const next = resolveCanvasDrop(widgets, 'moving', 6, 2)
  assert.equal(isValidCanvasLayout(next), true)
  assert.deepEqual(at(next, 'moving'), { x: 6, y: 2 })
})

test('repair and auto-layout preserve the full-grid invariant', () => {
  const widgets = Array.from({ length: 80 }, (_, index) =>
    card(`card-${index}`, ['1x1', '2x1', '1x2', '2x2', 'bar'][index % 5], 0, 0))
  const repaired = assignCanvasPositions(widgets)
  assert.equal(isValidCanvasLayout(repaired), true)
  assert.equal(isValidCanvasLayout(autoLayoutFromCenter(widgets)), true)
})

test('dense repeated drops never create an occupied cell', () => {
  const sizes = ['1x1', '2x1', '1x2', '2x2', 'bar']
  let widgets = assignCanvasPositions(Array.from({ length: 35 }, (_, index) =>
    card(`card-${index}`, sizes[index % sizes.length], 0, 0)))
  for (let step = 0; step < 120; step++) {
    const id = `card-${step % widgets.length}`
    const x = (step * 7) % 13 - 5
    const y = (step * 11) % 11 - 4
    widgets = resolveCanvasDrop(widgets, id, x, y)
    assert.equal(isValidCanvasLayout(widgets), true, `overlap after step ${step}`)
  }
})
