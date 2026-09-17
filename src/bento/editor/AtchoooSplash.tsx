'use client'

/**
 * ATCHOOO brand splash — filled geometric wordmark + yellow/blue curtain reveal.
 */

import { useEffect, useState } from 'react'
import './AtchoooSplash.css'

const SPLASH_TOTAL_MS = 2100

/**
 * Filled geometric ATCHOOO. Letters share one drawing system:
 * stem ~22 units on a 100 cap-height; O is a donut (outer/inner circles).
 */
function BrandMark({ ink, bg }: { ink: string; bg: string }) {
    return (
        <svg
            viewBox="0 0 820 120"
            role="img"
            aria-label="ATCHOOO"
            style={{ width: 'min(88vw, 760px)', height: 'auto' }}
        >
            <g fill={ink}>
                {/* A */}
                <path d="M18 110 L58 10 L78 10 L118 110 H94 L86 90 H50 L42 110 Z M56 70 H80 L68 38 Z" />
                {/* T */}
                <path d="M130 10 H210 V32 H181 V110 H159 V32 H130 Z" />
                {/* C — ring segment, same outer geometry as O */}
                <path d="M296 20 A50 50 0 1 0 296 100 L296 78 A28 28 0 1 1 296 42 Z" />
                {/* H */}
                <path d="M330 10 H352 V50 H398 V10 H420 V110 H398 V72 H352 V110 H330 Z" />
            </g>

            {/* O O O — donuts; outer ring animated via dash on stroke overlay */}
            {[0, 1, 2].map((i) => {
                const cx = 490 + i * 110
                const cy = 60
                const r = 40
                const c = 2 * Math.PI * r
                return (
                    <g key={i} transform={`translate(${cx} ${cy})`}>
                        <circle r="40" fill={ink} />
                        <circle r="18" fill={bg} />
                        <circle
                            className={`atch-oo atch-oo-${i + 1}`}
                            r={r}
                            fill="none"
                            stroke={ink}
                            strokeWidth="8"
                            strokeDasharray={c}
                            strokeDashoffset={c}
                            transform="rotate(-90)"
                            opacity="0.35"
                        />
                    </g>
                )
            })}
        </svg>
    )
}

export function AtchoooSplash({ onDone }: { onDone?: () => void }) {
    const [phase, setPhase] = useState<'draw' | 'reveal' | 'exit'>('draw')

    useEffect(() => {
        const t1 = window.setTimeout(() => setPhase('reveal'), 1200)
        const t2 = window.setTimeout(() => setPhase('exit'), 1680)
        const t3 = window.setTimeout(() => onDone?.(), SPLASH_TOTAL_MS)
        return () => {
            window.clearTimeout(t1)
            window.clearTimeout(t2)
            window.clearTimeout(t3)
        }
    }, [onDone])

    return (
        <div
            className={`atch-splash fixed inset-0 z-[100000] overflow-hidden ${phase === 'exit' ? 'is-exit' : ''}`}
            aria-hidden="true"
            style={{ pointerEvents: phase === 'exit' ? 'none' : 'auto' }}
        >
            <div className="absolute inset-0 flex items-center justify-center bg-[#1D4ED8]">
                <BrandMark ink="#FFFFFF" bg="#1D4ED8" />
            </div>

            <div
                className={`atch-yellow-layer absolute inset-0 flex items-center justify-center bg-[#F5C518] ${
                    phase === 'reveal' || phase === 'exit' ? 'is-open' : ''
                } ${phase === 'exit' ? 'is-exit' : ''}`}
            >
                <BrandMark ink="#111111" bg="#F5C518" />
            </div>
        </div>
    )
}

export const SPLASH_DURATION_MS = SPLASH_TOTAL_MS
export default AtchoooSplash
