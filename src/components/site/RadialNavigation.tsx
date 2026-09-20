'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type WheelEvent } from 'react'
import styles from './RadialNavigation.module.css'
import { SPACE_CONFIGS, spaceFromPath } from '@/lib/space-config'
import { motionTokens } from '@/design-system/tokens/motion'

const items = SPACE_CONFIGS.filter(space => space.visible)

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

function circularOffset(index: number, center: number, length: number) {
  let offset = index - center
  if (offset > length / 2) offset -= length
  if (offset < -length / 2) offset += length
  return offset
}

export function RadialNavigation({ hidden = false, compact = false }: { hidden?: boolean; compact?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const transitioning = useRef(false)
  const wheelDelta = useRef(0)
  const wheelTimer = useRef<number | null>(null)
  const previewDirection = useRef<'forward' | 'backward'>('forward')
  const activeIndex = Math.max(0, items.findIndex(item => item.id === spaceFromPath(pathname).id))
  const [displayIndex, setDisplayIndex] = useState(activeIndex)
  const displayIndexRef = useRef(activeIndex)
  const [hasLearned, setHasLearned] = useState(() =>
    typeof window === 'undefined' ||
      localStorage.getItem('atchooo-space-radial-learned') === '1' ||
      localStorage.getItem('account-hub-radial-learned') === '1'
  )

  useEffect(() => {
    displayIndexRef.current = activeIndex
    const timer = window.setTimeout(() => setDisplayIndex(activeIndex), 0)
    return () => window.clearTimeout(timer)
  }, [activeIndex])
  useEffect(() => () => {
    if (wheelTimer.current) window.clearTimeout(wheelTimer.current)
  }, [])
  const preview = (direction: number) => {
    previewDirection.current = direction > 0 ? 'forward' : 'backward'
    setDisplayIndex(index => {
      const next = (index + direction + items.length) % items.length
      displayIndexRef.current = next
      return next
    })
  }

  const navigateTo = (targetIndex: number) => {
    if (targetIndex === activeIndex || transitioning.current) return
    const target = items[targetIndex]
    const direction = previewDirection.current
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
      await waitForCanvas(target.id)
    })
    const cleanup = () => {
      transitioning.current = false
      setTransitionDirection(null)
    }
    void transition.finished.then(cleanup, cleanup)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (hidden || /input|textarea|select/i.test((event.target as HTMLElement)?.tagName || '')) return
      if (!['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Enter', 'Escape'].includes(event.key)) return
      event.preventDefault()
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') preview(-1)
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') preview(1)
      if (event.key === 'Enter') navigateTo(displayIndexRef.current)
      if (event.key === 'Escape') {
        displayIndexRef.current = activeIndex
        setDisplayIndex(activeIndex)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const choose = (event: MouseEvent<HTMLAnchorElement>, targetIndex: number) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (targetIndex === activeIndex) return
    displayIndexRef.current = targetIndex
    previewDirection.current = circularOffset(targetIndex, activeIndex, items.length) >= 0 ? 'forward' : 'backward'
    setDisplayIndex(targetIndex)
    localStorage.setItem('atchooo-space-radial-learned', '1')
    setHasLearned(true)
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
      preview(direction)
    }
    if (wheelTimer.current) window.clearTimeout(wheelTimer.current)
    wheelTimer.current = window.setTimeout(() => {
      navigateTo(displayIndexRef.current)
    }, motionTokens.navigationConfirm)
  }

  if (hidden) return null

  return (
    <nav className={`${styles.root} ${compact ? styles.compact : ''}`} aria-label="站点导航" onWheel={spin} style={{ '--active-index': displayIndex } as CSSProperties}>
      <span className={styles.hint}>{hasLearned ? `${items[displayIndex].label} ${String(displayIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}` : 'SCROLL TO SELECT'}</span>
      <div className={styles.disc} aria-hidden="true" />
      <div className={styles.rotor} aria-hidden="true">
        <span className={styles.ring} />
        <span className={styles.hub} />
      </div>
      <span className={styles.glass} aria-hidden="true" />
      <span className={styles.indicator} aria-hidden="true" />
      {items.map((item, index) => {
        const active = index === displayIndex
        const offset = circularOffset(index, displayIndex, items.length)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${active ? styles.active : ''}`}
            style={{ '--offset': offset } as CSSProperties}
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
