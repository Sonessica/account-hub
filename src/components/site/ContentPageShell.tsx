import type { ReactNode } from 'react'
import { RadialNavigation } from './RadialNavigation'

export function ContentPageShell({ title, description, children }: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <main className="min-h-screen bg-[#F5F5F7] px-10 py-14 text-black">
      <section className="mx-auto max-w-6xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-black/35">ATCHOOO</p>
        <h1 className="text-5xl font-semibold tracking-[-0.04em]">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-black/55">{description}</p>
        <div className="mt-12">{children}</div>
      </section>
      <RadialNavigation />
    </main>
  )
}
