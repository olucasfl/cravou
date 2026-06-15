import { useCallback, useEffect, useRef, useState } from 'react'
import s from './PullToRefresh.module.css'

const THRESHOLD = 80   // px para ativar
const MAX_PULL  = 120  // px máximo de arraste

interface Props {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export default function PullToRefresh({ onRefresh, children }: Props) {
  const [pullY, setPullY]           = useState(0)
  const [ready, setReady]           = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const startYRef  = useRef<number | null>(null)
  const pullingRef = useRef(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // só inicia se página está no topo
    if (window.scrollY > 0) return
    startYRef.current = e.touches[0].clientY
    pullingRef.current = false
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (refreshing || startYRef.current === null) return
    // se scroll rolou para baixo após o touchstart, cancela
    if (window.scrollY > 0) { startYRef.current = null; return }

    const delta = e.touches[0].clientY - startYRef.current
    if (delta <= 0) { startYRef.current = null; return }

    pullingRef.current = true
    // rubber-band: resistência cresce com o arraste
    const pull = Math.min(MAX_PULL, delta * (1 - delta / (MAX_PULL * 4)))
    setPullY(pull)
    setReady(pull >= THRESHOLD)

    // previne bounce nativo do iOS enquanto arrasta
    if (pull > 5) e.preventDefault()
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return
    pullingRef.current = false
    startYRef.current = null

    if (ready) {
      try { navigator.vibrate?.(30) } catch {}
      setRefreshing(true)
      setPullY(THRESHOLD)
      setReady(false)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullY(0)
      }
    } else {
      setPullY(0)
      setReady(false)
    }
  }, [ready, onRefresh])

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

  const isPulling      = pullY > 0
  const spinnerPct     = Math.min(1, pullY / THRESHOLD)
  const indicatorOffset = refreshing ? THRESHOLD : pullY

  return (
    <div ref={wrapperRef} className={s.wrapper}>
      {/* Indicador flutuante */}
      <div
        className={s.indicator}
        style={{ transform: `translateY(${indicatorOffset - 60}px)`, opacity: isPulling || refreshing ? 1 : 0 }}
        aria-hidden="true"
      >
        <div className={`${s.pill} ${ready ? s.pillReady : ''} ${refreshing ? s.pillRefreshing : ''}`}>
          {refreshing ? (
            <>
              <span className={s.spinner} />
              <span className={s.label}>Atualizando...</span>
            </>
          ) : (
            <>
              <span
                className={s.arrowWrap}
                style={{
                  opacity: spinnerPct,
                  transform: `rotate(${ready ? 180 : spinnerPct * 160}deg)`,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v10M4 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className={s.label} style={{ opacity: spinnerPct }}>
                {ready ? 'Solte para atualizar' : 'Arraste para atualizar'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Conteúdo — desliza levemente para baixo durante o pull */}
      <div
        className={s.content}
        style={{
          transform: (isPulling || refreshing)
            ? `translateY(${indicatorOffset * 0.4}px)`
            : undefined,
          transition: (!pullingRef.current || refreshing)
            ? 'transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)'
            : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
