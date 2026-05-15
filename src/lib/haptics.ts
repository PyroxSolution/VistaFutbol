export function vibrate(pattern: number | number[]): boolean {
  if (typeof navigator === 'undefined') return false
  if (typeof navigator.vibrate !== 'function') return false
  try {
    return navigator.vibrate(pattern)
  } catch {
    return false
  }
}

export function hasHaptics(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}
