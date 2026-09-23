'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { DEFAULT_GLOBAL_SETTINGS, normalizeGlobalSettings, type GlobalSettings } from './globalSettings'

type StoredSettings = { settings: GlobalSettings; revision: number }
type SettingsContextValue = {
  settings: GlobalSettings
  updateSettings: (patch: Partial<GlobalSettings>) => void
  saveState: 'saved' | 'saving' | 'error' | 'conflict'
  retry: () => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_GLOBAL_SETTINGS,
  updateSettings: () => undefined,
  saveState: 'saved',
  retry: () => undefined,
})

export function useGlobalSettings() {
  return useContext(SettingsContext)
}

export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saveState, setSaveState] = useState<SettingsContextValue['saveState']>('saved')
  const revision = useRef(0)
  const latest = useRef(settings)
  const savedHash = useRef(JSON.stringify(settings))
  const running = useRef(false)
  const conflicted = useRef(false)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const response = await fetch('/api/private/settings', { cache: 'no-store' })
      if (!response.ok) throw new Error('Settings load failed')
      const data = await response.json() as StoredSettings
      const normalized = normalizeGlobalSettings(data.settings)
      revision.current = data.revision
      latest.current = normalized
      savedHash.current = JSON.stringify(normalized)
      setSettings(normalized)
      setReady(true)
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const save = useCallback(async () => {
    if (running.current || conflicted.current) return
    running.current = true
    setSaveState('saving')
    try {
      while (JSON.stringify(latest.current) !== savedHash.current) {
        const snapshot = latest.current
        const hash = JSON.stringify(snapshot)
        const response = await fetch('/api/private/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revision: revision.current, settings: snapshot }),
        })
        if (response.status === 409) {
          conflicted.current = true
          setSaveState('conflict')
          return
        }
        if (!response.ok) throw new Error('Settings save failed')
        const data = await response.json() as StoredSettings
        revision.current = data.revision
        savedHash.current = hash
      }
      setSaveState('saved')
    } catch {
      setSaveState('error')
    } finally {
      running.current = false
    }
  }, [])

  const updateSettings = useCallback((patch: Partial<GlobalSettings>) => {
    const next = normalizeGlobalSettings({ ...latest.current, ...patch })
    latest.current = next
    setSettings(next)
    void save()
  }, [save])

  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-[#F5F5F7] text-sm text-black/60">
      {loadError ? <div className="text-center">设置加载失败。<button className="ml-2 underline" onClick={() => void load()}>重试</button></div> : '正在加载设置…'}
    </div>
  }

  return <SettingsContext.Provider value={{ settings, updateSettings, saveState, retry: () => void save() }}>
    {children}
    {saveState === 'error' && <div role="alert" className="fixed right-4 top-4 z-[100001] rounded-xl bg-black px-4 py-2 text-sm text-white">
      设置保存失败。<button className="ml-2 underline" onClick={() => void save()}>重试</button>
    </div>}
    {saveState === 'conflict' && <div role="alert" className="fixed right-4 top-4 z-[100001] rounded-xl bg-black px-4 py-2 text-sm text-white">
      设置已在其他浏览器更新。<button className="ml-2 underline" onClick={() => location.reload()}>刷新</button>
    </div>}
  </SettingsContext.Provider>
}
