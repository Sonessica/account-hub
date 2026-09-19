'use client'

import React, { useEffect, useRef, useState } from 'react'

import { EditorToolbar, useEditor, EditorFooter } from '@/bento/editor'
import { SettingsModal } from '@/bento/editor/SettingsModal'
import { InfiniteCanvas, assignCanvasPositions, autoLayoutFromCenter } from '@/bento/editor/InfiniteCanvas'
import { PersistentEditorProvider } from '@/bento/editor/PersistentEditorProvider'
import { RadialNavigation } from '@/components/site/RadialNavigation'

// ============ Editor View Wrapper ============

const EditorView: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isEditing } = useEditor()
    return (
        <div className="relative min-h-screen bg-[#F5F5F7] transition-colors duration-500">
            {children}
            {isEditing && <EditorToolbar />}
        </div>
    )
}

// ============ Editor Content ============

const EditorContent: React.FC<{ centerVersion: number }> = ({ centerVersion }) => {
    const {
        widgets,
        selectedWidgetId,
        setSelectedWidgetId,
        isEditing,
        removeWidget,
        updateWidget,
        reorderWidgets,
    } = useEditor()
    const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null)
    const draggingIdRef = useRef<string | null>(null)
    const repairedOnce = useRef(false)

    // Repair once after load, then only when a widget lacks x,y (new card).
    // Never rewrite coordinates while a card is being dragged.
    useEffect(() => {
        if (!widgets.length || draggingIdRef.current) return
        const missing = widgets.some((w) => typeof w.x !== 'number' || typeof w.y !== 'number')
        if (repairedOnce.current && !missing) return
        const positioned = assignCanvasPositions(widgets)
        repairedOnce.current = true
        if (positioned.some((w, i) => w.x !== widgets[i].x || w.y !== widgets[i].y)) {
            reorderWidgets(positioned)
        }
    }, [widgets, reorderWidgets])

    return (
        <InfiniteCanvas
            widgets={widgets}
            isEditing={isEditing}
            onUpdateWidget={updateWidget}
            onRemoveWidget={removeWidget}
            onSelect={setSelectedWidgetId}
            selectedWidgetId={selectedWidgetId}
            onOpenEdit={(id) => setEditingWidgetId(id || null)}
            editingWidgetId={editingWidgetId}
            onDragStateChange={(id) => { draggingIdRef.current = id }}
            onWidgetsChange={(next) => {
                draggingIdRef.current = null
                repairedOnce.current = true
                reorderWidgets(next)
            }}
            centerVersion={centerVersion}
        />
    )
}

// ============ Page Shell ============

const HubShell: React.FC = () => {
    const {
        isEditing,
        setIsEditing,
        profile,
        updateProfile,
        widgets,
        reorderWidgets,
    } = useEditor()
    const [showSettings, setShowSettings] = useState(false)
    const [centerVersion, setCenterVersion] = useState(0)

    return (
        <>
            <EditorContent centerVersion={centerVersion} />
            <EditorFooter
                isEditing={isEditing}
                onToggleEdit={() => setIsEditing(!isEditing)}
                onOpenSettings={() => setShowSettings(true)}
                onAutoLayout={() => {
                    if (!isEditing || !widgets.length) return
                    reorderWidgets(autoLayoutFromCenter(widgets))
                    setCenterVersion((version) => version + 1)
                }}
            />
            <RadialNavigation hidden={isEditing} />
            {showSettings && (
                <SettingsModal
                    profile={profile}
                    onProfileChange={updateProfile}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </>
    )
}

// ============ Page ============

export function BentoEditorPage({
    space = 'home',
    showSplash = true,
}: {
    space?: 'home' | 'notes' | 'gallery' | 'bookmarks'
    showSplash?: boolean
}) {
    return (
        <PersistentEditorProvider space={space} showSplash={showSplash}>
            <EditorView>
                <HubShell />
            </EditorView>
        </PersistentEditorProvider>
    )
}

export default function EditorPage() {
    return <BentoEditorPage />
}
