'use client'

/**
 * OpenBento - Editor Footer Component
 *
 * 底部页脚，包含设置图标
 */

import React from 'react'
import { Gear } from 'phosphor-react'

const SettingsIcon = () => (
    <Gear size={20} weight="regular" />
)

export const EditorFooter: React.FC = () => {
    return (
        <div
            className="fixed bottom-0 left-0 right-0 h-14 flex items-center px-6 bg-white/80 backdrop-blur-md border-t border-black/5 z-50"
            style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}
        >
            <button
                className="flex items-center justify-center w-9 h-9 rounded-lg text-black/40 hover:text-black/60 hover:bg-black/5 transition-colors"
                aria-label="Settings"
            >
                <SettingsIcon />
            </button>
        </div>
    )
}

export default EditorFooter
