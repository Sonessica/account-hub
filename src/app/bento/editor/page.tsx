'use client'

import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { motion } from 'framer-motion'

import { EditorToolbar, useEditor, EditorFooter, WidgetEditorPanel } from '@/bento/editor'
import { WidgetEditOverlay } from '@/bento/editor'
import { ResponsiveBentoGrid } from '@/bento/grid'
import { GridDndProvider, DraggableGridItem, swapItems, type GridItem } from '@/bento/dnd'
import {
    WidgetRenderer,
    createLinkWidgetConfig,
    createImageWidgetConfig,
    createTextWidgetConfig,
    createMapWidgetConfig,
} from '@/bento/widgets'
import type { WidgetConfig, WidgetSize } from '@/bento/widgets/types'
import { PersistentEditorProvider } from '@/bento/editor/PersistentEditorProvider'

const GRID_BREAKPOINTS = { mobile: 768, tablet: 1750 }

// ============ Editor View Wrapper ============

const EditorView: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#F5F5F7] pb-32 transition-colors duration-500">
            {/* Main Content Area */}
            <div className="flex justify-center px-8 py-12 overflow-x-hidden">
                <div
                    className="w-full max-w-[1760px] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
                >
                    <div className="transition-all duration-500">
                        {children}
                    </div>
                </div>
            </div>

            <EditorToolbar />
            <EditorFooter />
        </div>
    )
}

// ============ Widget Dimensions Map ============

const WIDGET_DIMENSIONS: Record<WidgetSize, { width: number; height: number }> = {
    '1x1': { width: 175, height: 175 },
    '2x1': { width: 390, height: 175 },
    '1x2': { width: 175, height: 390 },
    '2x2': { width: 390, height: 390 },
    'bar': { width: 390, height: 68 },
}

const parseWidgetSize = (size: WidgetSize): { cols: number; rows: number } => {
    if (size === 'bar') {
        return { cols: 2, rows: 1 }
    }
    const [cols, rows] = size.split('x').map(Number)
    return { cols, rows }
}

// ============ Editable Widget ============

interface EditableWidgetProps {
    widget: WidgetConfig
    isSelected: boolean
    onSelect: () => void
    onDelete: () => void
    onSizeChange: (size: WidgetSize) => void
    onUpdate: (updates: Partial<WidgetConfig>) => void
    isEditing: boolean
}

const EditableWidget: React.FC<EditableWidgetProps> = ({
    widget,
    isSelected,
    onSelect,
    onDelete,
    onSizeChange,
    onUpdate,
    isEditing,
}) => {
    const { cols, rows } = parseWidgetSize(widget.size)

    const content = (
        <div
            className="relative w-full h-full"
            onClick={(e) => {
                if (isEditing) {
                    e.stopPropagation()
                    onSelect()
                }
            }}
        >
            <WidgetRenderer
                config={widget}
                isEditing={isEditing}
                onConfigChange={onUpdate}
            />
            {isEditing && isSelected && (
                <WidgetEditOverlay
                    widget={widget}
                    onDelete={onDelete}
                    onSizeChange={onSizeChange}
                    onUpdate={onUpdate}
                />
            )}
        </div>
    )

    // Use CSS Grid dense flow for automatic layout
    // Removed Framer Motion layout to allow gridAutoFlow: 'dense' to work properly
    return (
        <motion.div
            id={`widget-${widget.id}`}
            transition={{
                layout: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 35,
                },
            }}
            style={{
                gridColumn: `span ${cols}`,
                gridRow: `span ${rows}`,
            }}
        >
            {isEditing ? (
                <DraggableGridItem id={widget.id}>
                    <div className="w-full h-full">
                        {content}
                    </div>
                </DraggableGridItem>
            ) : (
                <div className="w-full h-full">
                    {content}
                </div>
            )}
        </motion.div>
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
        addWidget,
        reorderWidgets,
    } = useEditor()
    const selectedWidget = widgets.find((widget) => widget.id === selectedWidgetId) || null
    const containerRef = useRef<HTMLDivElement>(null)
    const hasInitialized = useRef(false)

    // Initialize with example data if empty
    useEffect(() => {
        if (!hasInitialized.current && widgets.length === 0) {
            hasInitialized.current = true

            const exampleWidgets: WidgetConfig[] = [
                { ...createLinkWidgetConfig('https://instagram.com/biuty.ai', '1x1'), id: uuidv4() },
                { ...createLinkWidgetConfig('https://tiktok.com/@biuty.ai', '1x1'), id: uuidv4() },
                { ...createLinkWidgetConfig('https://biuty.ai', '1x1'), id: uuidv4() },
                { ...createLinkWidgetConfig('https://linkedin.com/company/biutyai', '1x1'), id: uuidv4() },
                { ...createTextWidgetConfig('', 'note', '1x1'), id: uuidv4() },
                { ...createImageWidgetConfig('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', '1x1'), id: uuidv4() },
                { ...createLinkWidgetConfig('https://twitter.com/biutyai', '2x2'), id: uuidv4() },
                { ...createMapWidgetConfig('Berlin, Germany', '2x2', { lat: 52.52, lng: 13.405, label: 'Berlin, Germany' }), id: uuidv4() },
            ]

            exampleWidgets.forEach((widget) => addWidget(widget))
        }
    }, [widgets.length, addWidget])

    // Click outside to deselect
    useEffect(() => {
        if (!isEditing) return

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.closest('[data-widget-editor]') || target.closest('[data-widget-overlay]')) return
            if (containerRef.current && !containerRef.current.contains(target)) {
                setSelectedWidgetId(null)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isEditing, setSelectedWidgetId])

    const handleSizeChange = useCallback((widgetId: string, newSize: WidgetSize) => {
        updateWidget(widgetId, { size: newSize })
    }, [updateWidget])

    // Convert to GridItem for DnD
    const gridItems: GridItem[] = useMemo(() => {
        return widgets.map((widget) => ({
            id: widget.id,
            size: widget.size,
            data: widget,
        }))
    }, [widgets])

    // Handle swap - exchange positions of two widgets
    const handleSwap = useCallback((fromId: string, toId: string) => {
        const newWidgets = swapItems(widgets, fromId, toId)
        reorderWidgets(newWidgets)
    }, [widgets, reorderWidgets])

    const gridContent = (
        <ResponsiveBentoGrid
            columns={8}
            tabletColumns={4}
            mobileColumns={2}
            breakpoints={GRID_BREAKPOINTS}
            centered
        >
            {widgets.map((widget) => (
                <EditableWidget
                    key={widget.id}
                    widget={widget}
                    isSelected={selectedWidgetId === widget.id}
                    onSelect={() => setSelectedWidgetId(widget.id)}
                    onDelete={() => removeWidget(widget.id)}
                    onSizeChange={(size) => handleSizeChange(widget.id, size)}
                    onUpdate={(updates) => updateWidget(widget.id, updates)}
                    isEditing={isEditing}
                />
            ))}
        </ResponsiveBentoGrid>
    )

    return (
        <div className="w-full" ref={containerRef}>
            <div className="mx-auto w-full">
                {isEditing ? (
                    <GridDndProvider
                        items={gridItems}
                        onSwap={handleSwap}
                        renderOverlay={(item) => {
                            const widget = item.data as WidgetConfig
                            const dims = WIDGET_DIMENSIONS[widget.size] || WIDGET_DIMENSIONS['1x1']
                            return (
                                <div style={{
                                    width: dims.width,
                                    height: dims.height,
                                    borderRadius: '27px',
                                    overflow: 'hidden',
                                }}>
                                    <WidgetRenderer config={widget} isEditing={false} />
                                </div>
                            )
                        }}
                    >
                        {gridContent}
                    </GridDndProvider>
                ) : (
                    gridContent
                )}
            </div>
            {isEditing && selectedWidget && (
                <WidgetEditorPanel
                    widget={selectedWidget}
                    onUpdate={(updates) => updateWidget(selectedWidget.id, updates)}
                    onClose={() => setSelectedWidgetId(null)}
                />
            )}
        </div>
    )
}

// ============ Page ============

export default function EditorPage() {
    return (
        <PersistentEditorProvider>
            <EditorView>
                <EditorContent />
            </EditorView>
        </PersistentEditorProvider>
    )
}
