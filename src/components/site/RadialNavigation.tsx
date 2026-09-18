'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookmarkSimple, DotsNine, House, Image, NotePencil } from 'phosphor-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import styles from './RadialNavigation.module.css'

const items = [
  { href: '/', label: '首页', icon: House, x: '-132px', y: '0px' },
  { href: '/notes', label: '笔记', icon: NotePencil, x: '-116px', y: '-78px' },
  { href: '/gallery', label: '图集', icon: Image, x: '-72px', y: '-128px' },
  { href: '/bookmarks', label: '收藏', icon: BookmarkSimple, x: '0px', y: '-146px' },
] as const

export function RadialNavigation({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', escape)
    }
  }, [open])

  if (hidden) return null

  return (
    <nav ref={rootRef} className={`${styles.root} ${open ? styles.open : ''}`} aria-label="站点导航">
      {items.map((item, index) => {
        const Icon = item.icon
        const active = item.href === '/' ? pathname === '/' || pathname === '/bento/editor' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${active ? styles.active : ''}`}
            style={{ '--x': item.x, '--y': item.y, '--index': index } as CSSProperties}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
          >
            <Icon size={22} weight={active ? 'fill' : 'regular'} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        )
      })}
      <button
        type="button"
        className={styles.mainButton}
        aria-label={open ? '关闭站点导航' : '打开站点导航'}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <DotsNine size={27} weight="bold" />
      </button>
    </nav>
  )
}
