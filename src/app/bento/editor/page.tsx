'use client'

import React, { useEffect, useState } from 'react'

import { EditorToolbar, useEditor, EditorFooter } from '@/bento/editor'
import { SettingsModal } from '@/bento/editor/SettingsModal'
import { InfiniteCanvas, assignCanvasPositions } from '@/bento/editor/InfiniteCanvas'
import { PersistentEditorProvider } from '@/bento/editor/PersistentEditorProvider'

// ============ Editor View Wrapper ============

const EditorView: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isEditing } = useEditor()
    return (
        <div className="relative min-h-screen bg-[#F5F5F7] transition-colors duration-500 pb-20">
            {children}
            {isEditing && <EditorToolbar />}
        </div>
    )
}

// ============ Editor Content ============

const EditorContent: React.FC = () => {
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
    // Repair legacy overlaps and position newly added cards before saving.
    useEffect(() => {
        if (!widgets.length) return
        const positioned = assignCanvasPositions(widgets)
        if (positioned.some((widget, index) => widget.x !== widgets[index].x || widget.y !== widgets[index].y)) {
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
        />
    )
}

// ============ Page Shell ============

const HubShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const {
        isEditing,
        setIsEditing,
        profile,
        updateProfile,
    } = useEditor()
    const [showSettings, setShowSettings] = useState(false)

    return (
        <>
            {children}
            <EditorFooter
                isEditing={isEditing}
                onToggleEdit={() => setIsEditing(!isEditing)}
                onOpenSettings={() => setShowSettings(true)}
            />
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

export default function EditorPage() {
    return (
        <PersistentEditorProvider>
            <EditorView>
                <HubShell>
                    <EditorContent />
                </HubShell>
            </EditorView>
        </PersistentEditorProvider>
    )
}
