'use client'

import { InfiniteCanvas } from '@/bento/editor/InfiniteCanvas'
import { RadialNavigation } from './RadialNavigation'

const noop = () => undefined

export function EmptyBentoCanvasPage() {
  return (
    <main className="relative min-h-screen bg-[#F5F5F7] pb-20">
      <InfiniteCanvas
        widgets={[]}
        isEditing={false}
        onUpdateWidget={noop}
        onRemoveWidget={noop}
        onSelect={noop}
        selectedWidgetId={null}
        onOpenEdit={noop}
        editingWidgetId={null}
      />
      <RadialNavigation />
    </main>
  )
}
