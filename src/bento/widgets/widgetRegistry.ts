import type { WidgetCategory, WidgetConfig, WidgetSize } from './types'
import { createImageWidgetConfig } from './image/ImageWidget'
import { createLinkWidgetConfig } from './link/LinkWidget'
import { createMapWidgetConfig } from './map/MapWidget'
import { createTextWidgetConfig } from './text/TextWidget'

export type WidgetAction = 'edit' | 'resize' | 'duplicate' | 'move' | 'replace' | 'lock' | 'hide' | 'delete'
export type WidgetPlugin = {
  type: WidgetCategory
  name: string
  icon: string
  defaultSize: WidgetSize
  allowedSizes: WidgetSize[]
  create: (input?: string) => WidgetConfig
  actions: WidgetAction[]
  sizeVariants: Partial<Record<WidgetSize, 'compact' | 'standard' | 'detail'>>
  metadataResolver?: (input: string) => Promise<Partial<WidgetConfig>>
}

const common: WidgetAction[] = ['edit', 'resize', 'duplicate', 'move', 'replace', 'lock', 'hide', 'delete']

export const WIDGET_REGISTRY: Record<Exclude<WidgetCategory, 'section'>, WidgetPlugin> = {
  link: { type: 'link', name: '链接', icon: 'link', defaultSize: '1x1', allowedSizes: ['1x1', '2x1', '1x2', '2x2'], create: (input = 'https://example.com') => createLinkWidgetConfig(input, '1x1'), actions: common, sizeVariants: { '1x1': 'compact', '2x1': 'standard', '2x2': 'detail' } },
  image: { type: 'image', name: '图片', icon: 'image', defaultSize: '1x1', allowedSizes: ['1x1', '2x1', '1x2', '2x2'], create: (input = '') => createImageWidgetConfig(input, '1x1'), actions: common, sizeVariants: { '1x1': 'compact', '2x1': 'standard', '2x2': 'detail' } },
  text: { type: 'text', name: '笔记', icon: 'text', defaultSize: '1x1', allowedSizes: ['1x1', '2x1', '1x2', '2x2'], create: (input = '') => createTextWidgetConfig(input, 'note', '1x1'), actions: common, sizeVariants: { '1x1': 'compact', '2x1': 'standard', '2x2': 'detail' } },
  map: { type: 'map', name: '位置', icon: 'map', defaultSize: '2x2', allowedSizes: ['1x1', '2x1', '1x2', '2x2'], create: (input = '') => createMapWidgetConfig(input, '2x2'), actions: common, sizeVariants: { '1x1': 'compact', '2x1': 'standard', '2x2': 'detail' } },
}

export function widgetPlugin(type: WidgetCategory) {
  return type === 'section' ? null : WIDGET_REGISTRY[type]
}
