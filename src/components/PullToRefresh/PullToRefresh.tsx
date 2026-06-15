import { useCallback, useEffect, useRef, useState } from 'react'
import s from './PullToRefresh.module.css'

const THRESHOLD = 100  // px para confirmar o refresh
const HIDDEN    = 120  // px acima da tela quando escondido

interface Props {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export default function PullToRefresh({ onRefresh, children }: Props) {
  const [pullY, setPullY]           = useState(0)
  const [pulling, setPulling]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const startYRef  = useRef<number | null>(null)
  const pullYRef   = useRef(0)          // ref síncrono lido no touchEnd
  const wrapperRef = useRef<HTMLDivElement>(null)

  // posição do spinner: -HIDDEN (escondido) → 0 (visível)
  const progress   = Math.min(pullY / THRESHOLD, 1)
  const translateY = refreshing ? 0 : (progress - 1) * HIDDEN

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0) return
    startYRef.current = e.touches[0].clientY
    pullYRef.current = 0
    setPulling(true)
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (refreshing || startYRef.current === null) return
    if (window.scrollY > 0) { startYRef.current = null; setPulling(false); return }

    const delta = e.touches[0].clientY - startYRef.current
    if (delta <= 0) {
      pullYRef.current = 0
      setPullY(0)
      return
    }

    // resistência após cruzar o threshold para não parecer solto demais
    const damped = delta <= THRESHOLD
      ? delta
      : THRESHOLD + (delta - THRESHOLD) * 0.3

    pullYRef.current = damped
    setPullY(damped)
    e.preventDefault()
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return
    startYRef.current = null
    setPulling(false)

    const delta = pullYRef.current
    pullYRef.current = 0

    if (delta < THRESHOLD) {
      setPullY(0)  // volta suavemente para cima
      return
    }

    try { navigator.vibrate?.(30) } catch {}
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
      setPullY(0)
    }
  }, [onRefresh])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false })
    el.addEventListener('touchend',   handleTouchEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove',  handleTouchMove)
      el.removeEventListener('touchend',   handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return (
    <div ref={wrapperRef} className={s.wrapper}>
      <div
        className={s.indicator}
        style={{
          transform: `translateY(${translateY}px)`,
          // sem transição enquanto o dedo está na tela — segue o dedo
          // com transição ao soltar — volta suave ou fica parado durante refresh
          transition: pulling ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        aria-hidden="true"
      >
        <span className={s.spinner} />
      </div>
      <div className={`${s.content} ${refreshing ? s.contentRefreshing : ''}`}>
        {children}
      </div>
    </div>
  )
}
