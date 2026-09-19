'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type WheelEvent } from 'react'
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
    const selector = `[data-space-canvas="${space}"]`
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      observer.disconnect()
      window.clearTimeout(timeout)
      window.setTimeout(resolve, 24)
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) finish()
    })
    const timeout = window.setTimeout(finish, 1200)
    observer.observe(document.body, { childList: true, subtree: true })
    if (document.querySelector(selector)) finish()
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
  const wheelDelta = useRef(0)
  const wheelTimer = useRef<number | null>(null)
  const activeIndex = Math.max(0, items.findIndex(item => isActive(pathname, item.href)))
  const [displayIndex, setDisplayIndex] = useState(activeIndex)
  const displayIndexRef = useRef(activeIndex)

  useEffect(() => {
    displayIndexRef.current = activeIndex
    const timer = window.setTimeout(() => setDisplayIndex(activeIndex), 0)
    return () => window.clearTimeout(timer)
  }, [activeIndex])
  useEffect(() => () => {
    if (wheelTimer.current) window.clearTimeout(wheelTimer.current)
  }, [])

  const navigateTo = (targetIndex: number) => {
    if (targetIndex === activeIndex || transitioning.current) return
    const target = items[targetIndex]
    const direction = targetIndex > activeIndex ? 'forward' : 'backward'
    const transitionDocument = document as ViewTransitionDocument
    transitioning.current = true
    setTransitionDirection(direction)

    if (!transitionDocument.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      router.push(target.href)
      transitioning.current = false
      setTransitionDirection(null)
      return
    }

    const transition = transitionDocument.startViewTransition(async () => {
      router.push(target.href)
      await waitForCanvas(target.space)
    })
    const cleanup = () => {
      transitioning.current = false
      setTransitionDirection(null)
    }
    void transition.finished.then(cleanup, cleanup)
  }

  const choose = (event: MouseEvent<HTMLAnchorElement>, targetIndex: number) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (targetIndex === activeIndex) return
    displayIndexRef.current = targetIndex
    setDisplayIndex(targetIndex)
    window.setTimeout(() => navigateTo(targetIndex), 110)
  }

  const spin = (event: WheelEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (transitioning.current) return
    wheelDelta.current += Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
    if (Math.abs(wheelDelta.current) >= 34) {
      const direction = wheelDelta.current > 0 ? 1 : -1
      wheelDelta.current = 0
      setDisplayIndex(index => {
        const next = Math.min(items.length - 1, Math.max(0, index + direction))
        displayIndexRef.current = next
        return next
      })
    }
    if (wheelTimer.current) window.clearTimeout(wheelTimer.current)
    wheelTimer.current = window.setTimeout(() => {
      navigateTo(displayIndexRef.current)
    }, 190)
  }

  if (hidden) return null

  return (
    <nav className={styles.root} aria-label="站点导航" onWheel={spin} style={{ '--active-index': displayIndex } as CSSProperties}>
      <span className={styles.hint}>SCROLL TO SELECT</span>
      <div className={styles.disc} aria-hidden="true" />
      <div className={styles.rotor} aria-hidden="true">
        <span className={styles.ring} />
        <span className={styles.hub} />
      </div>
      <span className={styles.glass} aria-hidden="true" />
      <span className={styles.indicator} aria-hidden="true" />
      {items.map((item, index) => {
        const active = index === displayIndex
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${active ? styles.active : ''}`}
            style={{ '--offset': index - displayIndex } as CSSProperties}
            aria-label={item.name}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            onClick={(event) => choose(event, index)}
          >
            <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.name}>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
