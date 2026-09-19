export const motionTokens = {
  fast: 140,
  normal: 220,
  expand: 260,
  navigationConfirm: 650,
  spring: { type: 'spring' as const, stiffness: 380, damping: 32, mass: 0.6 },
  settle: { type: 'spring' as const, stiffness: 320, damping: 25, mass: 0.7 },
}
