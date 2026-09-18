'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { GalleryImage, ImageWidgetConfig } from '../widgets/types'
import { COVER_EFFECT_OPTIONS, DEFAULT_COVER_EFFECT, GALLERY_MAX_IMAGES } from '../widgets/types'
import { uploadImage } from '@/lib/client/upload-image'
import {
    buildGalleryPatch,
    createGalleryImage,
    normalizeImageGallery,
    reorderGalleryImages,
} from '../widgets/image/gallery'

const fieldClass = 'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/5'
const labelClass = 'grid gap-1.5 text-xs font-medium text-black/60'
const btnClassDark = 'rounded-xl bg-black px-3 py-2.5 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-40'
const btnGhostClass = 'rounded-xl border border-black/15 px-3 py-2.5 text-sm font-medium text-black hover:bg-black/5 disabled:opacity-40'

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
    const gallery = useMemo(() => normalizeImageGallery(widget), [widget])
    const images = gallery.images
    const [previewIndex, setPreviewIndex] = useState(() => {
        const idx = images.findIndex((img) => img.id === gallery.coverId)
        return idx >= 0 ? idx : 0
    })
    const [status, setStatus] = useState<string | null>(null)
    const [selected, setSelected] = useState<Set<string>>(() => new Set())
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dragFromRef = useRef<number | null>(null)

    const safePreviewIndex = images.length
        ? Math.min(Math.max(previewIndex, 0), images.length - 1)
        : 0
    const previewImage = images[safePreviewIndex] || null

    useEffect(() => {
        if (!images.length) {
            setPreviewIndex(0)
            setSelected(new Set())
            return
        }
        setPreviewIndex((prev) => Math.min(prev, images.length - 1))
        setSelected((prev) => {
            const next = new Set<string>()
            for (const id of prev) {
                if (images.some((img) => img.id === id)) next.add(id)
            }
            return next
        })
    }, [images])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    const applyImages = (nextImages: GalleryImage[], coverId?: string) => {
        onUpdate(buildGalleryPatch(widget, nextImages, { coverId }))
    }

    const uploadFiles = async (fileList: FileList | File[] | null | undefined) => {
        if (!fileList) return
        const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'))
        if (!files.length) return

        const remaining = GALLERY_MAX_IMAGES - images.length
        if (remaining <= 0) {
            setStatus(`单图集最多 ${GALLERY_MAX_IMAGES} 张`)
            return
        }

        const toUpload = files.slice(0, remaining)
        if (files.length > remaining) {
            setStatus(`超出上限，本次仅上传前 ${remaining} 张（上限 ${GALLERY_MAX_IMAGES}）`)
        } else {
            setStatus(`正在上传 ${toUpload.length} 张…`)
        }

        const added: GalleryImage[] = []
        let failed = 0
        for (const file of toUpload) {
            try {
                const url = await uploadImage(file)
                added.push(createGalleryImage(url))
            } catch {
                failed += 1
            }
        }

        if (!added.length) {
            setStatus('图片上传失败')
            return
        }

        const nextImages = [...images, ...added]
        const nextCoverId =
            widget.coverId && nextImages.some((img) => img.id === widget.coverId)
                ? widget.coverId
                : nextImages[0]?.id
        applyImages(nextImages, nextCoverId)
        setPreviewIndex(images.length)
        setStatus(
            failed > 0
                ? `已上传 ${added.length} 张，失败 ${failed} 张`
                : `已上传 ${added.length} 张`,
        )
    }

    const removeImages = (ids: string[]) => {
        if (!ids.length) return
        const nextImages = images.filter((img) => !ids.includes(img.id))
        applyImages(nextImages)
        setSelected(new Set())
        setPreviewIndex((prev) => Math.min(prev, Math.max(nextImages.length - 1, 0)))
        setStatus(`已删除 ${ids.length} 张`)
    }

    const moveImage = (from: number, to: number) => {
        const next = reorderGalleryImages(images, from, to)
        applyImages(next, widget.coverId)
        setPreviewIndex(to)
    }

    const setCover = (id: string) => {
        applyImages(images, id)
        setStatus('已设为封面')
    }

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const coverMode = gallery.coverMode

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
                className="flex max-h-[min(88vh,820px)] w-full max-w-[min(96vw,1100px)] flex-col overflow-hidden rounded-3xl bg-white text-black shadow-2xl ring-1 ring-black/5 md:flex-row"
                onPointerDown={event => event.stopPropagation()}
                onClick={event => event.stopPropagation()}
            >
                <div className="flex min-h-[240px] flex-1 flex-col bg-[#F5F5F7] p-4 md:min-w-0 md:p-5">
                    <ImagePreview src={previewImage?.src || ''} />
                    {images.length > 1 && (
                        <div className="mt-2 text-center text-xs text-black/45">
                            预览 {safePreviewIndex + 1} / {images.length}
                        </div>
                    )}
                </div>

                <div className="flex w-full flex-col overflow-y-auto border-t border-black/5 p-5 md:w-[380px] md:border-l md:border-t-0">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">编辑卡片</p>
                            <h2 className="mt-1 text-lg font-semibold">Image Gallery</h2>
                        </div>
                        <button type="button" onClick={onClose} aria-label="关闭编辑弹窗"
                            className="grid size-9 shrink-0 place-items-center rounded-full bg-black/5 text-xl leading-none hover:bg-black/10">×</button>
                    </div>

                    <div className="grid gap-4">
                        <div className={labelClass}>
                            <span>图册（{images.length}/{GALLERY_MAX_IMAGES}）</span>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className={btnClassDark}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={images.length >= GALLERY_MAX_IMAGES}
                                >
                                    批量上传
                                </button>
                                <button
                                    type="button"
                                    className={btnGhostClass}
                                    disabled={selected.size === 0}
                                    onClick={() => removeImages(Array.from(selected))}
                                >
                                    删除所选{selected.size ? ` (${selected.size})` : ''}
                                </button>
                                <button
                                    type="button"
                                    className={btnGhostClass}
                                    disabled={selected.size === 0}
                                    onClick={() => setSelected(new Set())}
                                >
                                    取消选择
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                className="hidden"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={event => {
                                    void uploadFiles(event.target.files)
                                    event.target.value = ''
                                }}
                            />
                            {status && <span className="text-xs font-normal text-black/50">{status}</span>}
                            <span className="text-[11px] font-normal text-black/40">
                                拖拽缩略图可排序；点击选中；「封面」标记当前展示图。
                            </span>
                        </div>

                        {images.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {images.map((image, index) => {
                                    const isCover = image.id === gallery.coverId
                                    const isSelected = selected.has(image.id)
                                    return (
                                        <div
                                            key={image.id}
                                            draggable
                                            onDragStart={() => { dragFromRef.current = index }}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={() => {
                                                const from = dragFromRef.current
                                                dragFromRef.current = null
                                                if (from == null || from === index) return
                                                moveImage(from, index)
                                            }}
                                            className={[
                                                'relative overflow-hidden rounded-xl border bg-[#F0F0F2]',
                                                isSelected ? 'border-black ring-2 ring-black/30' : 'border-black/10',
                                                isCover ? 'outline outline-2 outline-offset-1 outline-emerald-500' : '',
                                            ].join(' ')}
                                        >
                                            <button
                                                type="button"
                                                className="block h-20 w-full"
                                                onClick={() => {
                                                    setPreviewIndex(index)
                                                    toggleSelect(image.id)
                                                }}
                                                onDoubleClick={() => setCover(image.id)}
                                                aria-label={`图片 ${index + 1}`}
                                            >
                                                <img src={image.src} alt="" className="h-full w-full object-cover" draggable={false} />
                                            </button>
                                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/45 px-1 py-0.5 text-[10px] text-white">
                                                <span>#{index + 1}</span>
                                                <span className="flex gap-1">
                                                    <button type="button" className="rounded bg-white/15 px-1 hover:bg-white/30"
                                                        onClick={() => moveImage(index, index - 1)} disabled={index === 0}>←</button>
                                                    <button type="button" className="rounded bg-white/15 px-1 hover:bg-white/30"
                                                        onClick={() => moveImage(index, index + 1)} disabled={index === images.length - 1}>→</button>
                                                    <button type="button"
                                                        className={['rounded px-1', isCover ? 'bg-emerald-500' : 'bg-white/15 hover:bg-white/30'].join(' ')}
                                                        onClick={() => setCover(image.id)}>
                                                        {isCover ? '封面' : '设封面'}
                                                    </button>
                                                    <button type="button" className="rounded bg-white/15 px-1 hover:bg-white/30"
                                                        onClick={() => removeImages([image.id])}>删</button>
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-black/15 px-3 py-6 text-center text-sm text-black/40">
                                暂无图片，请批量上传
                            </div>
                        )}

                        <label className={labelClass}>封面模式
                            <select
                                className={fieldClass}
                                value={coverMode}
                                disabled={images.length <= 1}
                                onChange={event => {
                                    const mode = event.target.value as 'fixed' | 'random'
                                    onUpdate({ coverMode: images.length > 1 ? mode : 'fixed' })
                                }}
                            >
                                <option value="fixed">固定封面</option>
                                <option value="random">随机封面（查看页约 15s 切换）</option>
                            </select>
                            {images.length <= 1 && (
                                <span className="text-[11px] font-normal text-black/40">多于 1 张时可开启随机封面；编辑模式始终显示固定封面。</span>
                            )}
                        </label>

                        <label className={labelClass}>封面切换特效
                            <select
                                className={fieldClass}
                                value={widget.coverEffect || DEFAULT_COVER_EFFECT}
                                disabled={images.length <= 1}
                                onChange={event => onUpdate({ coverEffect: event.target.value as ImageWidgetConfig['coverEffect'] })}
                            >
                                {COVER_EFFECT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <span className="text-[11px] font-normal text-black/40">
                                仅在查看模式、多图且开启随机封面时生效。「每次随机特效」会在 6 种转场中轮换。
                            </span>
                        </label>

                        <label className={labelClass}>替代文字（图集默认）
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
