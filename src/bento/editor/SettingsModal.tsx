'use client'

import { useEffect, useRef, useState } from 'react'
import type { ProfileData } from './EditorContext'
import { uploadImage } from '@/lib/client/upload-image'

const fieldClass = 'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/5'
const labelClass = 'grid gap-1.5 text-xs font-medium text-black/60'
const btnClass = 'rounded-xl bg-black px-3 py-2.5 text-sm font-medium text-white hover:bg-black/80'
const btnGhostClass = 'rounded-xl border border-black/15 px-3 py-2.5 text-sm font-medium text-black hover:bg-black/5'

export const APP_VERSION = '0.4.1'

type Tab = 'profile' | 'data' | 'about'

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: '个人资料' },
  { id: 'data', label: '数据' },
  { id: 'about', label: '关于' },
]

export function SettingsModal({
  profile,
  onProfileChange,
  onClose,
}: {
  profile: ProfileData
  onProfileChange: (patch: Partial<ProfileData>) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('profile')
  const [status, setStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const replaceAvatar = async (file?: File) => {
    if (!file) return
    setStatus('上传中…')
    try {
      onProfileChange({ avatarUrl: await uploadImage(file) })
      setStatus('头像已更新')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '上传失败')
    }
  }

  const exportJson = () => {
    const payload = { exportedAt: new Date().toISOString(), profile }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atchooo-profile-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (file?: File) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as { profile?: Partial<ProfileData> }
      if (data.profile) onProfileChange(data.profile)
      setStatus('已导入资料')
    } catch {
      setStatus('导入失败：文件格式不正确')
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
                  {status && <span className="text-xs font-normal text-black/50">{status}</span>}
                </label>
              </div>
            )}

            {tab === 'data' && (
              <div className="grid gap-4">
                <p className="text-sm text-black/55">导出/导入个人资料 JSON。</p>
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
                {status && <p className="text-xs text-black/50">{status}</p>}
              </div>
            )}

            {tab === 'about' && (
              <div className="grid gap-2 text-sm text-black/70">
                <p className="text-lg font-semibold text-black">ATCHOOO</p>
                <p>版本 {APP_VERSION}</p>
                <p>个人名片站 · 数据存于 NAS SQLite</p>
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
