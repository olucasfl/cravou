const KEY_PREFIX = 'cravou_wrapped_seen_'

// Sem ativação, não há o que "ver" — trata como já visto pra não disparar o gate.
export function hasSeenWrapped(activatedAt: string | null): boolean {
  if (!activatedAt) return true
  return localStorage.getItem(KEY_PREFIX + activatedAt) === '1'
}

export function markWrappedSeen(activatedAt: string | null): void {
  if (!activatedAt) return
  localStorage.setItem(KEY_PREFIX + activatedAt, '1')
}
