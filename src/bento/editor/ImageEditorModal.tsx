'use client'

import { useEffect, useRef, useState } from 'react'
import type { ImageWidgetConfig } from '../widgets/types'
import { uploadImage } from '@/lib/client/upload-image'

const fieldClass = 'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/5'
const labelClass = 'grid gap-1.5 text-xs font-medium text-black/60'

function OptionalText({ value, onChange, placeholder }: {
    value?: string
    onChange: (value: string | undefined) => void
    placeholder?: string
}) {
    return <input className={fieldClass} value={value || ''} placeholder={placeholder}
        onChange={event => onChange(event.target.value || undefined)} />
}

function ImagePreview({ src }: { src: string }) {
    const viewportRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

    useEffect(() => {
        setScale(1)
        setOffset({ x: 0, y: 0 })
    }, [src])

    // Non-passive wheel listener so page does not scroll while zooming
    useEffect(() => {
        const el = viewportRef.current
        if (!el) return
        const onWheel = (event: WheelEvent) => {
            event.preventDefault()
            const delta = event.deltaY > 0 ? 0.9 : 1.1
            setScale(prev => {
                const next = Math.min(4, Math.max(1, prev * delta))
                if (next === 1) setOffset({ x: 0, y: 0 })
                return next
            })
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    }, [src])

    const onPointerDown = (event: React.PointerEvent) => {
        if (scale <= 1) return
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
    }

    const onPointerMove = (event: React.PointerEvent) => {
        const drag = dragRef.current
        if (!drag) return
        setOffset({
            x: drag.ox + (event.clientX - drag.x),
            y: drag.oy + (event.clientY - drag.y),
        })
    }

    const onPointerUp = (event: React.PointerEvent) => {
        dragRef.current = null
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div
                ref={viewportRef}
                className="relative flex-1 cursor-grab touch-none overflow-hidden rounded-2xl bg-[#F0F0F2] select-none active:cursor-grabbing"
                style={{ minHeight: 280 }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                {src ? (
                    <img
                        src={src}
                        alt=""
                        draggable={false}
                        className="pointer-events-none absolute left-1/2 top-1/2 max-h-full max-w-full object-contain"
                        style={{
                            transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                            transformOrigin: 'center center',
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 grid place-items-center text-sm text-black/40">暂无图片</div>
                )}
            </div>
            <div className="mt-2 flex justify-end text-xs text-black/45">
                <span>{Math.round(scale * 100)}%</span>
            </div>
        </div>
    )
}

export function ImageEditorModal({
    widget,
    onUpdate,
    onClose,
}: {
    widget: ImageWidgetConfig
    onUpdate: (updates: Partial<ImageWidgetConfig>) => void
    onClose: () => void
}) {
    const [status, setStatus] = useState<string | null>(null)

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    const replaceImage = async (file?: File) => {
        if (!file) return
        setStatus('正在压缩并上传…')
        try {
            onUpdate({ src: await uploadImage(file) })
            setStatus('图片已替换')
        } catch (error) {
            setStatus(error instanceof Error ? error.message : '图片上传失败')
        }
    }

    return (
        <div
            data-widget-editor
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
            onPointerDown={event => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="编辑图片卡片"
                className="flex max-h-[min(88vh,760px)] w-full max-w-[min(96vw,980px)] flex-col overflow-hidden rounded-3xl bg-white text-black shadow-2xl ring-1 ring-black/5 md:flex-row"
                onPointerDown={event => event.stopPropagation()}
                onClick={event => event.stopPropagation()}
            >
                <div className="flex min-h-[240px] flex-1 flex-col bg-[#F5F5F7] p-4 md:min-w-0 md:p-5">
                    <ImagePreview src={widget.src} />
                </div>

                <div className="flex w-full flex-col overflow-y-auto border-t border-black/5 p-5 md:w-[340px] md:border-l md:border-t-0">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">编辑卡片</p>
                            <h2 className="mt-1 text-lg font-semibold">Image</h2>
                        </div>
                        <button type="button" onClick={onClose} aria-label="关闭编辑弹窗"
                            className="grid size-9 shrink-0 place-items-center rounded-full bg-black/5 text-xl leading-none hover:bg-black/10">×</button>
                    </div>

                    <div className="grid gap-4">
                        <label className={labelClass}>替换图片
                            <span className="cursor-pointer rounded-xl bg-black px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-black/80">
                                选择图片
                                <input className="hidden" type="file" accept="image/*"
                                    onChange={event => { void replaceImage(event.target.files?.[0]); event.target.value = '' }} />
                            </span>
                            {status && <span className="text-xs font-normal text-black/50">{status}</span>}
                        </label>
                        <label className={labelClass}>替代文字
                            <OptionalText value={widget.alt} onChange={alt => onUpdate({ alt })} />
                        </label>
                        <label className={labelClass}>标题
                            <OptionalText value={widget.title} onChange={title => onUpdate({ title })} />
                        </label>
                        <label className={labelClass}>副标题
                            <OptionalText value={widget.subtitle} onChange={subtitle => onUpdate({ subtitle })} />
                        </label>
                        <label className={labelClass}>图片填充方式
                            <select className={fieldClass} value={widget.objectFit || 'cover'}
                                onChange={event => onUpdate({ objectFit: event.target.value as ImageWidgetConfig['objectFit'] })}>
                                <option value="cover">裁切填满</option>
                                <option value="contain">完整显示</option>
                            </select>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    )
}
