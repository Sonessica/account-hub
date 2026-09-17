'use client'

/**
 * ATCHOOO brand splash.
 * Sequence: stroke three O's → yellow curtain reveals blue → panel exits.
 */

import { useEffect, useState } from 'react'
import './AtchoooSplash.css'

const SPLASH_TOTAL_MS = 2100
// Geometric monoline metrics (shared by ATCH paths and O circles)
const STROKE = 22
const O_R = 39
const O_C = 2 * Math.PI * O_R // ≈ 245

function BrandMark({ ink }: { ink: string }) {
    return (
        <svg
            viewBox="0 0 760 120"
            role="img"
            aria-label="ATCHOOO"
            style={{
                width: 'min(86vw, 720px)',
                height: 'auto',
                overflow: 'visible',
            }}
        >
            <g
                fill="none"
                stroke={ink}
                strokeWidth={STROKE}
                strokeLinecap="butt"
                strokeLinejoin="miter"
            >
                {/* A */}
                <g transform="translate(8,10)">
                    <path d="M6 100 L40 8 L74 100" />
                    <path d="M20 68 H60" />
                </g>
                {/* T */}
                <g transform="translate(98,10)">
                    <path d="M6 11 H74" />
                    <path d="M40 11 V100" />
                </g>
                {/* C — same circular language as O, open on the right */}
                <g transform="translate(188,10)">
                    <path d="M64 28 A39 39 0 1 0 64 72" />
                </g>
                {/* H */}
                <g transform="translate(278,10)">
                    <path d="M12 8 V100" />
                    <path d="M68 8 V100" />
                    <path d="M12 54 H68" />
                </g>
                {/* O O O — animated progress rings */}
                {[0, 1, 2].map((i) => (
                    <g key={i} transform={`translate(${378 + i * 118}, 60)`}>
                        <circle
                            className={`atch-oo atch-oo-${i + 1}`}
                            cx="0"
                            cy="0"
                            r={O_R}
                            strokeDasharray={O_C}
                            strokeDashoffset={O_C}
                            transform="rotate(-90)"
                        />
                    </g>
                ))}
            </g>
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
                <BrandMark ink="#FFFFFF" />
            </div>

            <div
                className={`atch-yellow-layer absolute inset-0 flex items-center justify-center bg-[#F5C518] ${
                    phase === 'reveal' || phase === 'exit' ? 'is-open' : ''
                } ${phase === 'exit' ? 'is-exit' : ''}`}
            >
                <BrandMark ink="#111111" />
            </div>
        </div>
    )
}

export const SPLASH_DURATION_MS = SPLASH_TOTAL_MS
export default AtchoooSplash
