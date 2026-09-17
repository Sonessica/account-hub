'use client'

import type { QuickNavItem } from './siteSettings'

export function QuickNav({ items }: { items: QuickNavItem[] }) {
  if (!items.length) return null
  return (
    <div className="pointer-events-auto fixed right-4 top-4 z-[90] flex flex-wrap justify-end gap-2">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-medium text-black shadow-sm ring-1 ring-black/5 backdrop-blur-md transition hover:bg-white"
        >
          {item.label}
        </a>
      ))}
    </div>
  )
}

export default QuickNav
