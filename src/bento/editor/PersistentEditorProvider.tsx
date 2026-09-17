'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { EditorProvider, useEditor, type ProfileData } from './EditorContext'
import type { WidgetConfig } from '../widgets/types'
import savingLoader from './SavingLoader.module.css'
import { AtchoooSplash, SPLASH_DURATION_MS } from './AtchoooSplash'

type Snapshot = {
  widgets: WidgetConfig[]
  profile: ProfileData
}
type Stored = Snapshot & { revision: number; updatedAt: string }
type GateState = 'splash' | 'import' | 'ready' | 'error'
type SaveState = 'saved' | 'saving' | 'error' | 'conflict'

const LAYOUT_KEY = 'openbento-widgets'
const PROFILE_KEY = 'openbento-profile'
const defaultProfile: ProfileData = {
  name: 'LinkCard',
  description: 'The first context-aware identity OS. Create a dynamic Link Card that lives natively in Apple Wallet. Features AI agents, offline sync, and zero-app sharing.',
}

function localSnapshot(): Snapshot | null {
  try {
    const layout = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null')
    const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')
    const widgets = Array.isArray(layout?.desktopWidgets) ? layout.desktopWidgets : Array.isArray(layout?.widgets) ? layout.widgets : []
    const hasProfile = profile && (profile.name !== defaultProfile.name || profile.description !== defaultProfile.description || profile.avatarUrl)
    if (!widgets.length && !hasProfile) return null
    return {
      widgets,
      profile: {
        name: typeof profile?.name === 'string' ? profile.name : defaultProfile.name,
        description: typeof profile?.description === 'string' ? profile.description : defaultProfile.description,
        ...(typeof profile?.avatarUrl === 'string' ? { avatarUrl: profile.avatarUrl } : {}),
      },
    }
  } catch {
    return null
  }
}

function PersistenceSync({ initial }: { initial: Stored | null }) {
  const { widgets, profile } = useEditor()
  const [status, setStatus] = useState<SaveState>('saved')
  const revision = useRef(initial?.revision || 0)
  const latest = useRef<Snapshot>({ widgets, profile })
  const savedHash = useRef(initial ? JSON.stringify({
    widgets: initial.widgets, profile: initial.profile,
  }) : '')
  const running = useRef(false)
  const conflicted = useRef(false)
  const hydrated = useRef(false)

  const save = useCallback(async () => {
    if (running.current || conflicted.current) return
    running.current = true
    try {
      while (JSON.stringify(latest.current) !== savedHash.current) {
        const snapshot = latest.current
        const hash = JSON.stringify(snapshot)
        const startedAt = Date.now()
        setStatus('saving')
        const response = await fetch('/api/private/editor', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin', body: JSON.stringify({ revision: revision.current, snapshot }),
        })
        if (response.status === 409) {
          conflicted.current = true
          setStatus('conflict')
          return
        }
        if (!response.ok) throw new Error(`Save failed: ${response.status}`)
        const result = await response.json() as { snapshot: Stored }
        revision.current = result.snapshot.revision
        savedHash.current = hash
        const remaining = 700 - (Date.now() - startedAt)
        if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining))
      }
      setStatus('saved')
    } catch (error) {
      console.error(error)
      setStatus('error')
    } finally {
      running.current = false
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { hydrated.current = true }, 400)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    latest.current = { widgets, profile }
    const timer = setTimeout(() => {
      if (!hydrated.current) return
      const snapshot = latest.current
      if (!initial && !snapshot.widgets.length &&
          snapshot.profile.name === defaultProfile.name && snapshot.profile.description === defaultProfile.description) return
      if (JSON.stringify(snapshot) !== savedHash.current) void save()
    }, 1500)
    return () => clearTimeout(timer)
  }, [widgets, profile, initial, save])

  if (status === 'saved') return null
  if (status === 'saving') return <div role="status" aria-label="正在保存到 NAS" className="fixed top-3 right-4 z-[100] rounded-xl bg-white/95 px-3 pb-3 pt-1 shadow-lg">
    <div className={savingLoader.loader} aria-hidden="true" />
  </div>
  return <div role="alert" className="fixed top-4 right-4 z-[100] rounded-xl bg-white/95 px-4 py-2 text-sm text-black shadow-lg">
    {status === 'error' && <><span>保存失败，修改仍在此浏览器。</span><button className="ml-3 underline" onClick={() => void save()}>重试</button></>}
    {status === 'conflict' && <><span>其他浏览器已更新，请先刷新页面。</span><button className="ml-3 underline" onClick={() => location.reload()}>刷新</button></>}
  </div>
}

function toEditorInitial(snapshot: Stored | null) {
  if (!snapshot) return undefined
  return {
    desktopWidgets: snapshot.widgets,
    mobileWidgets: [] as WidgetConfig[],
    layoutIndependent: { desktop: false, mobile: false },
    profile: snapshot.profile,
  }
}

export function PersistentEditorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>('splash')
  const [message, setMessage] = useState('')
  const [initial, setInitial] = useState<Stored | null>(null)
  const [draft, setDraft] = useState<Snapshot | null>(null)
  const [splashDone, setSplashDone] = useState(false)
  const dataReady = useRef(false)
  const [showEditor, setShowEditor] = useState(false)

  const finishIfReady = useCallback(() => {
    if (dataReady.current && splashDone) setShowEditor(true)
  }, [splashDone])

  useEffect(() => { finishIfReady() }, [finishIfReady])

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/private/editor', { cache: 'no-store' })
      if (!response.ok) throw new Error(`Load failed: ${response.status}`)
      const data = await response.json() as { snapshot: Stored | null }
      dataReady.current = true
      if (data.snapshot) {
        setInitial(data.snapshot)
        setState('ready')
      } else {
        const local = localSnapshot()
        if (local) { setDraft(local); setState('import') }
        else { setInitial(null); setState('ready') }
      }
    } catch (error) {
      dataReady.current = true
      setMessage(error instanceof Error ? error.message : '无法连接到 NAS 数据库')
      setState('error')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function saveInitial(snapshot: Snapshot) {
    setMessage('')
    try {
      const response = await fetch('/api/private/editor', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: 0, snapshot }),
      })
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { error?: string } | null
        if (response.status === 413) setMessage('卡片数据超过上传上限。原卡片仍在此浏览器，请勿清除浏览器数据。')
        else if (response.status === 409) setMessage('NAS 已有新数据，请刷新页面后再操作。')
        else setMessage(`保存失败（${response.status}）：${detail?.error || '请稍后重试'}。原卡片未删除。`)
        return
      }
      const result = await response.json() as { snapshot: Stored }
      setInitial(result.snapshot)
      setState('ready')
    } catch {
      setMessage('无法连接到 NAS。原卡片仍在此浏览器，请稍后重试。')
    }
  }

  const ready = state === 'ready'

  return (
    <>
      {!splashDone && (
        <AtchoooSplash onDone={() => { setSplashDone(true) }} />
      )}

      {ready && showEditor && (
        <EditorProvider persistence="external" initialSnapshot={toEditorInitial(initial)}>
          <PersistenceSync initial={initial} />
          {children}
        </EditorProvider>
      )}

      {ready && !showEditor && (
        <div className="min-h-screen bg-[#1D4ED8]" aria-hidden="true" />
      )}

      {state === 'import' && splashDone && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#F5F5F7] p-6 text-black">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
            <h1 className="text-2xl font-semibold mb-3">ATCHOOO</h1>
            <p className="mb-4 text-sm text-gray-600">NAS 数据库还是空的，发现当前浏览器有旧卡片。是否一次性导入？</p>
            <button className="w-full rounded-xl bg-black p-3 text-white" onClick={() => { if (draft) void saveInitial(draft) }}>导入本地卡片</button>
            <button className="mt-3 w-full rounded-xl border p-3" onClick={() => void saveInitial({
              widgets: [], profile: defaultProfile,
            })}>从空白开始（旧卡片仍留在此浏览器）</button>
            {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
          </div>
        </div>
      )}

      {state === 'error' && splashDone && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#F5F5F7] p-6 text-black">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
            <h1 className="text-2xl font-semibold mb-3">ATCHOOO</h1>
            <p className="mb-4 text-sm text-gray-600">{message || '加载失败'}</p>
            <button className="rounded-xl bg-black px-4 py-3 text-white" onClick={() => void load()}>重试</button>
          </div>
        </div>
      )}
    </>
  )
}

export const _SPLASH_MS = SPLASH_DURATION_MS
