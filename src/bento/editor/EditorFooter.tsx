'use client'

/**
 * Footer: settings + edit/view toggle for the personal hub.
 */

import React from 'react'
import { Gear, PencilSimple, Check } from 'phosphor-react'

export const EditorFooter: React.FC<{
    isEditing?: boolean
    onToggleEdit?: () => void
    onOpenSettings?: () => void
}> = ({ isEditing = false, onToggleEdit, onOpenSettings }) => {
    return (
        <div
            className="fixed bottom-0 left-0 right-0 h-14 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md border-t border-black/5 z-50"
            style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}
        >
            <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-black/40 hover:text-black/60 hover:bg-black/5 transition-colors"
                aria-label="设置"
            >
                <Gear size={20} weight="regular" />
            </button>

            <button
                type="button"
                onClick={onToggleEdit}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                    isEditing
                        ? 'bg-black text-white hover:bg-black/85'
                        : 'bg-black/5 text-black/70 hover:bg-black/10'
                }`}
                aria-label={isEditing ? '完成编辑' : '编辑页面'}
            >
                {isEditing ? <Check size={16} weight="bold" /> : <PencilSimple size={16} weight="bold" />}
                {isEditing ? '完成' : '编辑'}
            </button>
        </div>
    )
}

export default EditorFooter
