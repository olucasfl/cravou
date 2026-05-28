const _store = new Map<string, { data: unknown; ts: number }>()

export function getCache<T>(key: string, ttlMs: number): T | undefined {
  const hit = _store.get(key)
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data as T
  return undefined
}

export function setCache(key: string, data: unknown): void {
  _store.set(key, { data, ts: Date.now() })
}

export function clearCache(...prefixes: string[]): void {
  if (prefixes.length === 0) { _store.clear(); return }
  for (const key of _store.keys()) {
    if (prefixes.some(p => key.startsWith(p))) _store.delete(key)
  }
}
