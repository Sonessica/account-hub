'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createLinkWidgetConfig, createTextWidgetConfig } from '@/bento/widgets'
import { SPACE_CONFIGS } from '@/lib/space-config'
import { useEditor } from './EditorContext'

export function CommandPalette({ onAutoLayout }: { onAutoLayout: () => void }) {
  const { addWidget, widgets } = useEditor()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setOpen((value) => !value)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const matches = useMemo(() => widgets.filter((widget) => JSON.stringify(widget).toLowerCase().includes(query.toLowerCase())).slice(0, 5), [query, widgets])
  const submit = () => {
    const value = query.trim()
    if (!value) return
    if (/^https?:\/\//i.test(value)) addWidget(createLinkWidgetConfig(value, '1x1'))
    else addWidget(createTextWidgetConfig(value, 'note', '1x1'))
    setQuery(''); setOpen(false)
  }
  if (!open) return null

  return <div className="fixed inset-0 z-[120000] flex items-start justify-center bg-black/20 pt-[14vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
    <div className="w-[min(620px,90vw)] overflow-hidden rounded-[24px] border border-white/70 bg-white/90 shadow-2xl backdrop-blur-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} placeholder="Paste anything… 或输入命令" className="w-full border-b border-black/5 bg-transparent px-6 py-5 text-lg outline-none" />
      <div className="max-h-[55vh] overflow-auto p-2 text-sm">
        <button className="w-full rounded-xl px-4 py-3 text-left hover:bg-black/5" onClick={submit}>＋ {/^https?:\/\//i.test(query) ? '智能识别并添加链接' : '添加文字卡片'}</button>
        <button className="w-full rounded-xl px-4 py-3 text-left hover:bg-black/5" onClick={() => { onAutoLayout(); setOpen(false) }}>自动布局</button>
        {SPACE_CONFIGS.map((space) => <button key={space.id} className="w-full rounded-xl px-4 py-3 text-left hover:bg-black/5" onClick={() => router.push(space.href)}>切换到 {space.name}</button>)}
        {matches.map((widget) => <button key={widget.id} className="w-full rounded-xl px-4 py-3 text-left text-black/55 hover:bg-black/5" onClick={() => { document.getElementById(`widget-${widget.id}`)?.scrollIntoView({ block: 'center', inline: 'center' }); setOpen(false) }}>定位卡片 · {'title' in widget ? widget.title || widget.category : widget.category}</button>)}
      </div>
    </div>
  </div>
}
