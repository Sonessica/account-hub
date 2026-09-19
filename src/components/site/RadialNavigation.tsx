'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, type CSSProperties, type MouseEvent } from 'react'
import styles from './RadialNavigation.module.css'

const items = [
  { href: '/', space: 'home', label: 'HOME', name: '首页' },
  { href: '/notes', space: 'notes', label: 'NOTES', name: '笔记' },
  { href: '/gallery', space: 'gallery', label: 'GALLERY', name: '图集' },
  { href: '/bookmarks', space: 'bookmarks', label: 'SAVED', name: '收藏' },
] as const

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => { finished: Promise<void> }
}

function waitForCanvas(space: string) {
  return new Promise<void>((resolve) => {
    const started = performance.now()
    const check = () => {
      if (document.querySelector(`[data-space-canvas="${space}"]`) || performance.now() - started > 1800) {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        return
      }
      requestAnimationFrame(check)
    }
    check()
  })
}

function setTransitionDirection(direction: 'forward' | 'backward' | null) {
  if (direction) document.documentElement.dataset.spaceTransition = direction
  else delete document.documentElement.dataset.spaceTransition
}

function isActive(pathname: string, href: string) {
  return href === '/'
    ? pathname === '/' || pathname === '/bento/editor'
    : pathname === href || pathname.startsWith(`${href}/`)
}

export function RadialNavigation({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const transitioning = useRef(false)
  const activeIndex = Math.max(0, items.findIndex(item => isActive(pathname, item.href)))

  const navigate = (event: MouseEvent<HTMLAnchorElement>, targetIndex: number) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (targetIndex === activeIndex) {
      event.preventDefault()
      return
    }

    const transitionDocument = document as ViewTransitionDocument
    if (!transitionDocument.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    event.preventDefault()
    if (transitioning.current) return
    transitioning.current = true
    setTransitionDirection(targetIndex > activeIndex ? 'forward' : 'backward')
    const target = items[targetIndex]
    const transition = transitionDocument.startViewTransition(async () => {
      router.push(target.href)
      await waitForCanvas(target.space)
    })
    void transition.finished.finally(() => {
      transitioning.current = false
      setTransitionDirection(null)
    })
  }

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
              onClick={(event) => navigate(event, index)}
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
