export type SpaceId = 'home' | 'notes' | 'gallery' | 'bookmarks'
export type SpaceConfig = { id: SpaceId; name: string; label: string; href: string; order: number; visible: boolean; theme: string; anchor: { kind: 'reserved'; cols: number; rows: number } | { kind: 'origin' } }

export const SPACE_CONFIGS: readonly SpaceConfig[] = [
  { id: 'home', name: '首页', label: 'HOME', href: '/', order: 0, visible: true, theme: 'neutral', anchor: { kind: 'reserved', cols: 4, rows: 1 } },
  { id: 'notes', name: '笔记', label: 'NOTES', href: '/notes', order: 1, visible: true, theme: 'paper', anchor: { kind: 'origin' } },
  { id: 'gallery', name: '图集', label: 'GALLERY', href: '/gallery', order: 2, visible: true, theme: 'media', anchor: { kind: 'origin' } },
  { id: 'bookmarks', name: '收藏', label: 'SAVED', href: '/bookmarks', order: 3, visible: true, theme: 'library', anchor: { kind: 'origin' } },
] as const

export function spaceFromPath(pathname: string) {
  return SPACE_CONFIGS.find(space => space.href === '/' ? pathname === '/' || pathname === '/bento/editor' : pathname === space.href || pathname.startsWith(`${space.href}/`)) || SPACE_CONFIGS[0]
}
