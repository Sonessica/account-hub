'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ProfileData } from './EditorContext'
import { uploadImage } from '@/lib/client/upload-image'
import { useGlobalSettings } from './GlobalSettingsProvider'
import { COVER_EFFECT_OPTIONS } from '../widgets/types'
import {
  getCanvasZoom,
  recenterCanvas,
  resetCanvasView,
  setCanvasZoom,
  stepCanvasZoom,
  subscribeCanvasZoom,
  ZOOM_MAX,
  ZOOM_MIN,
} from './canvasViewControls'

const fieldClass = 'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/5'
const labelClass = 'grid gap-1.5 text-xs font-medium text-black/60'
const btnClass = 'rounded-xl bg-black px-3 py-2.5 text-sm font-medium text-white hover:bg-black/80'
const btnGhostClass = 'rounded-xl border border-black/15 px-3 py-2.5 text-sm font-medium text-black hover:bg-black/5'

export const APP_VERSION = '0.7.2'

type Tab = 'profile' | 'playback' | 'view' | 'data' | 'about'

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: '个人资料' },
  { id: 'playback', label: '媒体与动效' },
  { id: 'view', label: '画布' },
  { id: 'data', label: '数据' },
  { id: 'about', label: '关于' },
]

function CanvasZoomControls() {
  const { settings, updateSettings } = useGlobalSettings()
  const zoom = useSyncExternalStore(subscribeCanvasZoom, getCanvasZoom, () => 1)
  const percent = Math.round(zoom * 100)

  return (
    <div className="grid gap-4">
      <div className={labelClass}>
        <span>缩放</span>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btnGhostClass} onClick={() => stepCanvasZoom(-1)} aria-label="缩小">−</button>
          <div className="min-w-[4.5rem] rounded-xl border border-black/10 bg-white px-3 py-2 text-center text-sm font-semibold tabular-nums">
            {percent}%
          </div>
          <button type="button" className={btnGhostClass} onClick={() => stepCanvasZoom(1)} aria-label="放大">＋</button>
          <button
            type="button"
            className={btnClass}
            onClick={() => { setCanvasZoom(1); recenterCanvas() }}
          >
            重置并居中
          </button>
        </div>
        <input
          type="range"
          min={Math.round(ZOOM_MIN * 100)}
          max={Math.round(ZOOM_MAX * 100)}
          step={1}
          value={percent}
          onChange={(e) => setCanvasZoom(Number(e.target.value) / 100)}
          className="mt-1 w-full accent-black"
          aria-label="画布缩放"
        />
        <span className="text-[11px] font-normal text-black/45">
          范围 {Math.round(ZOOM_MIN * 100)}%–{Math.round(ZOOM_MAX * 100)}%；也可在画布上 Ctrl/⌘ + 滚轮缩放。
        </span>
      </div>

      <div className={labelClass}>
        <span>视图</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhostClass} onClick={() => recenterCanvas()}>居中锚点</button>
          <button type="button" className={btnGhostClass} onClick={() => resetCanvasView(settings.defaultCanvasZoom)}>恢复默认视图</button>
        </div>
        <span className="text-[11px] font-normal text-black/45">
          首页以搜索框为中心，其他空间以画布原点为中心；是否自动居中可在下方设置。
        </span>
      </div>
      <label className={labelClass}>默认画布缩放：{Math.round(settings.defaultCanvasZoom * 100)}%
        <input type="range" min={35} max={180} step={5}
          value={Math.round(settings.defaultCanvasZoom * 100)}
          onChange={(e) => updateSettings({ defaultCanvasZoom: Number(e.target.value) / 100 })}
          className="w-full accent-black" />
        <span className="text-[11px] font-normal text-black/45">没有本地视图记录时使用；“恢复默认视图”也会采用此值。</span>
      </label>
      <label className="flex items-center gap-2 text-sm text-black/70">
        <input type="checkbox" checked={settings.autoRecenter}
          onChange={(e) => updateSettings({ autoRecenter: e.target.checked })} />
        进入 Space 时自动居中
      </label>
      <label className="flex items-center gap-2 text-sm text-black/70">
        <input type="checkbox" checked={settings.splashEnabled}
          onChange={(e) => updateSettings({ splashEnabled: e.target.checked })} />
        每次浏览器会话显示开场动画
      </label>
    </div>
  )
}

function PlaybackSettings() {
  const { settings, updateSettings, saveState } = useGlobalSettings()
  return <div className="grid gap-5">
    <p className="text-sm text-black/55">以下设置在四个 Space 共用，修改后自动保存到 NAS。</p>
    {([
      ['photoDwellMs', '悬停导览：每张静图停留', 0.5, 10, 0.5],
      ['videoMaxMs', '悬停导览：视频最多播放', 1, 30, 1],
      ['hoverDelayMs', '启动悬停预览的延迟', 0, 2, 0.1],
      ['randomCoverIntervalMs', '新图集随机封面间隔', 2, 120, 1],
    ] as const).map(([key, label, min, max, step]) => (
      <label key={key} className={labelClass}>{label}：{settings[key] / 1000} 秒
        <input className="w-full accent-black" type="range" min={min} max={max} step={step}
          value={settings[key] / 1000}
          onChange={(e) => updateSettings({ [key]: Number(e.target.value) * 1000 })} />
      </label>
    ))}
    <label className="flex items-center gap-2 text-sm text-black/70">
      <input type="checkbox" checked={settings.hoverVideoPreview}
        onChange={(e) => updateSettings({ hoverVideoPreview: e.target.checked })} />
      悬停时播放视频与 Live Photo
    </label>
    <label className="flex items-center gap-2 text-sm text-black/70">
      <input type="checkbox" checked={settings.reducedMotion}
        onChange={(e) => updateSettings({ reducedMotion: e.target.checked })} />
      减少图集切换动效
    </label>
    <label className={labelClass}>新图集默认切换特效
      <select className={fieldClass} value={settings.defaultCoverEffect}
        onChange={(e) => updateSettings({ defaultCoverEffect: e.target.value as typeof settings.defaultCoverEffect })}>
        {COVER_EFFECT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    <label className={labelClass}>新图片卡片默认填充
      <select className={fieldClass} value={settings.defaultImageFit}
        onChange={(e) => updateSettings({ defaultImageFit: e.target.value as typeof settings.defaultImageFit })}>
        <option value="cover">裁切填满</option>
        <option value="contain">完整显示</option>
      </select>
    </label>
    <p className="text-xs text-black/45">已有卡片明确设置的切换间隔、特效和填充方式保持原样，可在单张卡片里修改。</p>
    {saveState === 'saving' && <span className="text-xs text-black/45">正在保存设置…</span>}
  </div>
}

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
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-black/5 p-3 md:w-40 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
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
              <h2 className="mt-1 text-lg font-semibold">
                {tab === 'profile' ? '个人资料' : tab === 'playback' ? '媒体与动效' : tab === 'view' ? '画布视图' : tab === 'data' ? '数据' : '关于'}
              </h2>
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

            {tab === 'view' && <CanvasZoomControls />}
            {tab === 'playback' && <PlaybackSettings />}

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
