import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assignCanvasPositions,
  autoLayoutFromCenter,
  isValidCanvasLayout,
  resolveCanvasDrop,
  resolveCanvasResize,
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
    card(`card-${index}`, ['1x1', '2x1', '1x2', '2x2'][index % 4], 0, 0))
  const repaired = assignCanvasPositions(widgets)
  assert.equal(isValidCanvasLayout(repaired), true)
  assert.equal(isValidCanvasLayout(autoLayoutFromCenter(widgets)), true)
})

test('dense repeated drops never create an occupied cell', () => {
  const sizes = ['1x1', '2x1', '1x2', '2x2']
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

test('auto-layout is deterministic and balanced around the search box', () => {
  const widgets = Array.from({ length: 40 }, (_, index) =>
    card(`card-${index}`, ['1x1', '2x1', '1x2', '2x2'][index % 4], 20, 20))
  const first = autoLayoutFromCenter(widgets)
  const second = autoLayoutFromCenter(widgets)
  assert.deepEqual(first, second)
  assert.equal(isValidCanvasLayout(first), true)

  const minX = Math.min(0, ...first.map((widget) => widget.x))
  const maxX = Math.max(3, ...first.map((widget) => widget.x + Number(widget.size[0]) - 1))
  const minY = Math.min(0, ...first.map((widget) => widget.y))
  const maxY = Math.max(0, ...first.map((widget) => widget.y + Number(widget.size[2]) - 1))
  assert.ok(Math.abs(-minX - (maxX - 3)) <= 2)
  assert.ok(Math.abs(-minY - maxY) <= 2)
})

test('growing a card pushes every card covered by its new footprint', () => {
  const widgets = [
    card('growing', '1x1', 5, 2),
    card('right', '1x1', 6, 2),
    card('below', '1x1', 5, 3),
    card('diagonal', '1x1', 6, 3),
  ]
  const next = resolveCanvasResize(widgets, 'growing', '2x2')
  assert.equal(next.find((widget) => widget.id === 'growing').size, '2x2')
  assert.deepEqual(at(next, 'growing'), { x: 5, y: 2 })
  assert.equal(isValidCanvasLayout(next), true)
  for (const id of ['right', 'below', 'diagonal']) assert.notDeepEqual(at(next, id), at(widgets, id))
})

test('shrinking a card leaves every other card in place', () => {
  const widgets = [card('shrinking', '2x2', 5, 2), card('neighbor', '1x1', 7, 2)]
  const next = resolveCanvasResize(widgets, 'shrinking', '1x1')
  assert.equal(next.find((widget) => widget.id === 'shrinking').size, '1x1')
  assert.deepEqual(at(next, 'neighbor'), at(widgets, 'neighbor'))
  assert.equal(isValidCanvasLayout(next), true)
})
