'use client'

import { useEffect, useRef, useState } from 'react'
import type { ProfileData } from './EditorContext'
import type { QuickNavItem, SiteSettings } from './siteSettings'
import { uploadImage } from '@/lib/client/upload-image'

const fieldClass = 'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/5'
const labelClass = 'grid gap-1.5 text-xs font-medium text-black/60'
const btnClass = 'rounded-xl bg-black px-3 py-2.5 text-sm font-medium text-white hover:bg-black/80'
const btnGhostClass = 'rounded-xl border border-black/15 px-3 py-2.5 text-sm font-medium text-black hover:bg-black/5'

export const APP_VERSION = '0.4.0'

type Tab = 'profile' | 'nav' | 'data' | 'about'

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: '个人资料' },
  { id: 'nav', label: '快捷导航' },
  { id: 'data', label: '数据' },
  { id: 'about', label: '关于' },
]

export function SettingsModal({
  profile,
  settings,
  onProfileChange,
  onSettingsChange,
  onClose,
}: {
  profile: ProfileData
  settings: SiteSettings
  onProfileChange: (patch: Partial<ProfileData>) => void
  onSettingsChange: (settings: SiteSettings) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('profile')
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const replaceAvatar = async (file?: File) => {
    if (!file) return
    setUploadStatus('上传中…')
    try {
      onProfileChange({ avatarUrl: await uploadImage(file) })
      setUploadStatus('头像已更新')
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : '上传失败')
    }
  }

  const updateNav = (id: string, patch: Partial<QuickNavItem>) => {
    onSettingsChange({
      quickNav: settings.quickNav.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      settings,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atchooo-settings-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (file?: File) => {
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as { profile?: Partial<ProfileData>; settings?: SiteSettings }
      if (data.profile) onProfileChange(data.profile)
      if (data.settings?.quickNav) onSettingsChange(data.settings)
      setUploadStatus('已导入设置')
    } catch {
      setUploadStatus('导入失败：文件格式不正确')
    }
  }

  return (
    <div
      data-widget-editor
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="设置"
        className="flex max-h-[min(88vh,720px)] w-full max-w-[min(96vw,920px)] flex-col overflow-hidden rounded-3xl bg-white text-black shadow-2xl ring-1 ring-black/5 md:flex-row"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <nav className="flex shrink-0 gap-1 border-b border-black/5 p-3 md:w-40 md:flex-col md:border-b-0 md:border-r md:p-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                tab === item.id ? 'bg-black text-white' : 'text-black/70 hover:bg-black/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-black/5 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">ATCHOOO</p>
              <h2 className="mt-1 text-lg font-semibold">设置</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="关闭设置"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-black/5 text-xl leading-none hover:bg-black/10">×</button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {tab === 'profile' && (
              <div className="grid gap-4">
                <label className={labelClass}>昵称
                  <input className={fieldClass} value={profile.name}
                    onChange={(e) => onProfileChange({ name: e.target.value })} />
                </label>
                <label className={labelClass}>简介
                  <textarea className={`${fieldClass} min-h-24 resize-y`} value={profile.description}
                    onChange={(e) => onProfileChange({ description: e.target.value })} />
                </label>
                <label className={labelClass}>头像
                  <div className="flex items-center gap-3">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" className="size-14 rounded-2xl object-cover" />
                    ) : (
                      <div className="grid size-14 place-items-center rounded-2xl bg-black/5 text-black/40">—</div>
                    )}
                    <button type="button" className={btnClass} onClick={() => fileRef.current?.click()}>
                      更换头像
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { void replaceAvatar(e.target.files?.[0]); e.target.value = '' }} />
                  </div>
                  {uploadStatus && <span className="text-xs font-normal text-black/50">{uploadStatus}</span>}
                </label>
              </div>
            )}

            {tab === 'nav' && (
              <div className="grid gap-4">
                <p className="text-sm text-black/55">显示在页面右上角的常驻入口，例如密码库、家庭自动化等。</p>
                {settings.quickNav.map((item) => (
                  <div key={item.id} className="grid gap-2 rounded-2xl border border-black/10 p-3 sm:grid-cols-[1fr_2fr_auto]">
                    <input className={fieldClass} value={item.label} placeholder="名称"
                      onChange={(e) => updateNav(item.id, { label: e.target.value })} />
                    <input className={fieldClass} value={item.url} placeholder="https://…"
                      onChange={(e) => updateNav(item.id, { url: e.target.value })} />
                    <button type="button" className={btnGhostClass}
                      onClick={() => onSettingsChange({ quickNav: settings.quickNav.filter((x) => x.id !== item.id) })}>
                      删除
                    </button>
                  </div>
                ))}
                <button type="button" className={btnGhostClass}
                  onClick={() => onSettingsChange({
                    quickNav: [...settings.quickNav, { id: crypto.randomUUID(), label: '新链接', url: 'https://' }],
                  })}>
                  添加入口
                </button>
              </div>
            )}

            {tab === 'data' && (
              <div className="grid gap-4">
                <p className="text-sm text-black/55">导出/导入仅包含资料与快捷导航；卡片布局仍在编辑器中直接维护。</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnClass} onClick={exportJson}>导出 JSON</button>
                  <button type="button" className={btnGhostClass} onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'application/json'
                    input.onchange = () => { void importJson(input.files?.[0]) }
                    input.click()
                  }}>导入 JSON</button>
                </div>
                {uploadStatus && <p className="text-xs text-black/50">{uploadStatus}</p>}
              </div>
            )}

            {tab === 'about' && (
              <div className="grid gap-2 text-sm text-black/70">
                <p className="text-lg font-semibold text-black">ATCHOOO Account Hub</p>
                <p>版本 {APP_VERSION}</p>
                <p>个人名片 / 导航站 · 数据存于 NAS SQLite</p>
                <p className="text-black/45">公开可访问；编辑与设置在本机自动保存。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
