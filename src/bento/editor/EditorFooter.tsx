'use client'

/**
 * Footer: settings + auto-layout + edit/view toggle.
 */

import React from 'react'
import { Gear, PencilSimple, Check, Shuffle } from 'phosphor-react'

export const EditorFooter: React.FC<{
    isEditing?: boolean
    onToggleEdit?: () => void
    onOpenSettings?: () => void
    onAutoLayout?: () => void
}> = ({ isEditing = false, onToggleEdit, onOpenSettings, onAutoLayout }) => {
    return (
        <div
            className="fixed bottom-0 left-0 right-0 h-14 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md border-t border-black/5 z-50"
            style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}
        >
            <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-black/40 hover:text-black/60 hover:bg-black/5 transition-colors"
                aria-label="Settings"
            >
                <Gear size={20} weight="regular" />
            </button>

            <div className="flex items-center gap-2">
                {isEditing && onAutoLayout && (
                    <button
                        type="button"
                        onClick={onAutoLayout}
                        className="flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-[13px] font-semibold text-black/70 transition hover:bg-black/10"
                        aria-label="Auto layout"
                    >
                        <Shuffle size={16} weight="bold" />
                        自动布局
                    </button>
                )}

                <button
                    type="button"
                    onClick={onToggleEdit}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                        isEditing
                            ? 'bg-black text-white hover:bg-black/85'
                            : 'bg-black/5 text-black/70 hover:bg-black/10'
                    }`}
                    aria-label={isEditing ? 'Finish editing' : 'Edit page'}
                >
                    {isEditing ? <Check size={16} weight="bold" /> : <PencilSimple size={16} weight="bold" />}
                    {isEditing ? '完成' : '编辑'}
                </button>
            </div>
        </div>
    )
}

export default EditorFooter
