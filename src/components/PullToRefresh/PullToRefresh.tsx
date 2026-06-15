import { useCallback, useEffect, useRef, useState } from 'react'
import s from './PullToRefresh.module.css'

const THRESHOLD = 70

interface Props {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export default function PullToRefresh({ onRefresh, children }: Props) {
  const [visible, setVisible]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const startYRef  = useRef<number | null>(null)
  const pulledRef  = useRef(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0) return
    startYRef.current = e.touches[0].clientY
    pulledRef.current = false
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (refreshing || startYRef.current === null) return
    if (window.scrollY > 0) { startYRef.current = null; return }

    const delta = e.touches[0].clientY - startYRef.current
    if (delta <= 0) { startYRef.current = null; return }

    if (delta > 10) {
      pulledRef.current = true
      setVisible(true)
      e.preventDefault()
    }
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pulledRef.current) return
    pulledRef.current = false
    startYRef.current = null

    try { navigator.vibrate?.(30) } catch {}
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
      setVisible(false)
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
      <div className={`${s.indicator} ${visible ? s.indicatorVisible : ''}`} aria-hidden="true">
        <span className={s.spinner} />
      </div>
      {children}
    </div>
  )
}
