'use client'

/**
 * ATCHOOO brand splash.
 * Sequence: stroke three O's → yellow curtain reveals blue → panel exits.
 */

import { useEffect, useState } from 'react'
import './AtchoooSplash.css'

const SPLASH_TOTAL_MS = 2100

function BrandMark({ ink, ring }: { ink: string; ring: string }) {
    const dash = 264
    const size = 'clamp(48px, 12vw, 104px)'
    return (
        <div
            className="flex items-center justify-center"
            style={{ fontFamily: "'Inter', 'Arial Black', sans-serif", color: ink, gap: '0.04em' }}
        >
            <span
                className="font-black leading-none"
                style={{ fontSize: size, letterSpacing: '-0.04em' }}
            >
                ATCH
            </span>
            {[0, 1, 2].map((i) => (
                <svg
                    key={i}
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                    style={{ width: size, height: size, flexShrink: 0 }}
                >
                    <circle
                        className={`atch-oo atch-oo-${i + 1}`}
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke={ring}
                        strokeWidth="18"
                        strokeDasharray={dash}
                        strokeDashoffset={dash}
                        transform="rotate(-90 50 50)"
                    />
                </svg>
            ))}
        </div>
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
                <BrandMark ink="#FFFFFF" ring="#FFFFFF" />
            </div>

            <div
                className={`atch-yellow-layer absolute inset-0 flex items-center justify-center bg-[#F5C518] ${
                    phase === 'reveal' || phase === 'exit' ? 'is-open' : ''
                } ${phase === 'exit' ? 'is-exit' : ''}`}
            >
                <BrandMark ink="#111111" ring="#111111" />
            </div>
        </div>
    )
}

export const SPLASH_DURATION_MS = SPLASH_TOTAL_MS
export default AtchoooSplash
