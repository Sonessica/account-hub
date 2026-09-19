'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type CSSProperties } from 'react'
import styles from './RadialNavigation.module.css'

const items = [
  { href: '/', label: 'HOME', name: '首页' },
  { href: '/notes', label: 'NOTES', name: '笔记' },
  { href: '/gallery', label: 'GALLERY', name: '图集' },
  { href: '/bookmarks', label: 'SAVED', name: '收藏' },
] as const

function isActive(pathname: string, href: string) {
  return href === '/'
    ? pathname === '/' || pathname === '/bento/editor'
    : pathname.startsWith(href)
}

export function RadialNavigation({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname()
  const activeIndex = Math.max(0, items.findIndex(item => isActive(pathname, item.href)))

  if (hidden) return null

  return (
    <nav
      className={styles.root}
      aria-label="站点导航"
      style={{ '--active-index': activeIndex } as CSSProperties}
    >
      <span className={styles.hint}>SELECT A SPACE</span>
      <div className={styles.panel}>
        <span className={styles.indicator} aria-hidden="true" />
        <span className={styles.wheel} aria-hidden="true" />
        <span className={styles.glass} aria-hidden="true" />

        {items.map((item, index) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.item} ${active ? styles.active : ''}`}
              style={{ '--offset': index - activeIndex } as CSSProperties}
              aria-label={item.name}
              aria-current={active ? 'page' : undefined}
            >
              <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.label}>{item.label}</span>
              <span className={styles.name}>{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
