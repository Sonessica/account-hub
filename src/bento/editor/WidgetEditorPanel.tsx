'use client'

import type {
    ImageWidgetConfig,
    LinkWidgetConfig,
    MapWidgetConfig,
    SectionTitleConfig,
    TextWidgetConfig,
    WidgetConfig,
} from '../widgets/types'

interface WidgetEditorPanelProps {
    widget: WidgetConfig
    onUpdate: (updates: Partial<WidgetConfig>) => void
    onClose: () => void
}

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

export function WidgetEditorPanel({ widget, onUpdate, onClose }: WidgetEditorPanelProps) {
    return (
        <aside
            data-widget-editor
            className="fixed inset-x-3 bottom-24 z-[10000] max-h-[62vh] overflow-y-auto rounded-3xl bg-white p-5 text-black shadow-2xl ring-1 ring-black/5 md:inset-x-auto md:bottom-auto md:right-5 md:top-5 md:max-h-[calc(100vh-7rem)] md:w-[360px]"
            onPointerDown={event => event.stopPropagation()}
            onClick={event => event.stopPropagation()}
        >
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">编辑卡片</p>
                    <h2 className="mt-1 text-lg font-semibold capitalize">{widget.category}</h2>
                </div>
                <button type="button" onClick={onClose} aria-label="关闭编辑面板"
                    className="grid size-9 place-items-center rounded-full bg-black/5 text-xl leading-none hover:bg-black/10">×</button>
            </div>

            <div className="grid gap-4">
                {widget.category === 'link' && <LinkFields widget={widget} onUpdate={onUpdate} />}
                {widget.category === 'image' && <ImageFields widget={widget} onUpdate={onUpdate} />}
                {widget.category === 'text' && <TextFields widget={widget} onUpdate={onUpdate} />}
                {widget.category === 'map' && <MapFields widget={widget} onUpdate={onUpdate} />}
                {widget.category === 'section' && <SectionFields widget={widget} onUpdate={onUpdate} />}
            </div>
        </aside>
    )
}

function LinkFields({ widget, onUpdate }: { widget: LinkWidgetConfig; onUpdate: WidgetEditorPanelProps['onUpdate'] }) {
    return <>
        <label className={labelClass}>链接地址
            <input className={fieldClass} type="url" value={widget.url} onChange={event => onUpdate({ url: event.target.value })} />
        </label>
        <label className={labelClass}>标题
            <OptionalText value={widget.title} placeholder="自动识别平台名称" onChange={title => onUpdate({ title })} />
        </label>
        <label className={labelClass}>副标题
            <OptionalText value={widget.subtitle} onChange={subtitle => onUpdate({ subtitle })} />
        </label>
        <label className={labelClass}>按钮文字
            <OptionalText value={widget.ctaLabel} onChange={ctaLabel => onUpdate({ ctaLabel })} />
        </label>
        <label className={labelClass}>自定义图标（URL 或 Emoji）
            <OptionalText value={widget.customIcon} onChange={customIcon => onUpdate({ customIcon })} />
        </label>
        <label className={labelClass}>背景颜色
            <div className="flex gap-2">
                <input className="h-10 w-12 rounded-lg border border-black/10 p-1" type="color" value={widget.customColor || '#ffffff'}
                    onChange={event => onUpdate({ customColor: event.target.value })} />
                <OptionalText value={widget.customColor} placeholder="使用平台默认颜色" onChange={customColor => onUpdate({ customColor })} />
            </div>
        </label>
    </>
}

function ImageFields({ widget, onUpdate }: { widget: ImageWidgetConfig; onUpdate: WidgetEditorPanelProps['onUpdate'] }) {
    return <>
        <label className={labelClass}>图片地址
            <input className={fieldClass} type="url" value={widget.src} onChange={event => onUpdate({ src: event.target.value })} />
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
    </>
}

function TextFields({ widget, onUpdate }: { widget: TextWidgetConfig; onUpdate: WidgetEditorPanelProps['onUpdate'] }) {
    return <>
        <label className={labelClass}>文本内容
            <textarea className={`${fieldClass} min-h-28 resize-y`} value={widget.content}
                onChange={event => onUpdate({ content: event.target.value })} />
        </label>
        <label className={labelClass}>样式
            <select className={fieldClass} value={widget.variant}
                onChange={event => onUpdate({ variant: event.target.value as TextWidgetConfig['variant'] })}>
                <option value="plain">普通文本</option>
                <option value="note">便签</option>
                <option value="quote">引用</option>
            </select>
        </label>
        {widget.variant === 'quote' && <label className={labelClass}>署名
            <OptionalText value={widget.attribution} onChange={attribution => onUpdate({ attribution })} />
        </label>}
        {widget.variant === 'note' && <label className={labelClass}>Emoji
            <OptionalText value={widget.emoji} onChange={emoji => onUpdate({ emoji })} />
        </label>}
    </>
}

function MapFields({ widget, onUpdate }: { widget: MapWidgetConfig; onUpdate: WidgetEditorPanelProps['onUpdate'] }) {
    const location = widget.location
    const updateLocation = (patch: Partial<NonNullable<MapWidgetConfig['location']>>) =>
        onUpdate({ location: { lat: location?.lat || 0, lng: location?.lng || 0, ...location, ...patch } })

    return <>
        <label className={labelClass}>标题
            <OptionalText value={widget.title} onChange={title => onUpdate({ title })} />
        </label>
        <label className={labelClass}>位置标签
            <OptionalText value={location?.label} onChange={label => updateLocation({ label })} />
        </label>
        <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>纬度
                <input className={fieldClass} type="number" step="any" value={location?.lat ?? 0}
                    onChange={event => updateLocation({ lat: Number(event.target.value) })} />
            </label>
            <label className={labelClass}>经度
                <input className={fieldClass} type="number" step="any" value={location?.lng ?? 0}
                    onChange={event => updateLocation({ lng: Number(event.target.value) })} />
            </label>
        </div>
        <label className={labelClass}>缩放级别
            <input className={fieldClass} type="range" min="1" max="20" value={widget.zoom || 11}
                onChange={event => onUpdate({ zoom: Number(event.target.value) })} />
            <span className="text-right text-xs text-black/40">{widget.zoom || 11}</span>
        </label>
        <label className={labelClass}>地图样式
            <select className={fieldClass} value={widget.style || 'light'}
                onChange={event => onUpdate({ style: event.target.value as MapWidgetConfig['style'] })}>
                <option value="light">浅色</option>
                <option value="dark">深色</option>
                <option value="satellite">卫星</option>
            </select>
        </label>
    </>
}

function SectionFields({ widget, onUpdate }: { widget: SectionTitleConfig; onUpdate: WidgetEditorPanelProps['onUpdate'] }) {
    return <label className={labelClass}>分区标题
        <input className={fieldClass} value={widget.title} onChange={event => onUpdate({ title: event.target.value })} />
    </label>
}
