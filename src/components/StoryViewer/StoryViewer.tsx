import { useCallback, useRef, useState } from 'react'
import { X } from 'lucide-react'
import s from './StoryViewer.module.css'

export interface Scene {
  id: string
  /** Duração até o avanço automático. Use Infinity para uma cena que só avança por ação do usuário (ex.: encerramento). */
  durationMs?: number
  render: (opts: { paused: boolean }) => React.ReactNode
}

interface Props {
  scenes: Scene[]
  onExit: () => void
}

const DEFAULT_DURATION_MS = 7000
const HOLD_DELAY_MS = 180
const TAP_LEFT_RATIO = 0.35
const MOVE_SLOP_PX = 10 // abaixo disso, é tremor do dedo, não um arrasto de verdade
const SWIPE_THRESHOLD_PX = 60

export default function StoryViewer({ scenes, onExit }: Props) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const holdTimer = useRef<number | null>(null)
  const downX = useRef<number | null>(null)
  const downY = useRef(0)
  const moved = useRef(false)
  const swiped = useRef(false)

  const scene = scenes[index]
  const isLast = index === scenes.length - 1
  const duration = scene?.durationMs ?? DEFAULT_DURATION_MS
  const autoAdvance = Number.isFinite(duration) && !isLast

  const goTo = useCallback((next: number) => {
    if (next < 0) { setIndex(0); return }
    if (next >= scenes.length) { onExit(); return }
    setIndex(next)
  }, [scenes.length, onExit])

  function clearHoldTimer() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    downX.current = e.clientX
    downY.current = e.clientY
    moved.current = false
    swiped.current = false
    clearHoldTimer()
    holdTimer.current = window.setTimeout(() => setPaused(true), HOLD_DELAY_MS)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (downX.current === null || swiped.current) return
    const dx = e.clientX - downX.current
    const dy = e.clientY - downY.current

    if (!moved.current && (Math.abs(dx) > MOVE_SLOP_PX || Math.abs(dy) > MOVE_SLOP_PX)) {
      moved.current = true
      clearHoldTimer() // é um arrasto, não um "segurar para pausar"
      setPaused(false)
    }

    // Arrasto predominantemente horizontal além do limiar → troca de cena na hora,
    // como um swipe de verdade (não precisa soltar o dedo).
    if (moved.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD_PX) {
      swiped.current = true
      goTo(dx < 0 ? index + 1 : index - 1)
    }
  }

  function handlePointerUp() {
    clearHoldTimer()
    const wasPaused = paused
    const wasSwiped = swiped.current
    const wasMoved = moved.current
    const x = downX.current
    setPaused(false)
    downX.current = null

    if (wasSwiped) return   // já navegou durante o próprio arrasto
    if (wasPaused) return   // era só "segurar para pausar"
    if (wasMoved) return    // arrastou mas não passou do limiar de swipe — cancela, sem navegar
    if (x === null) return
    if (x < window.innerWidth * TAP_LEFT_RATIO) goTo(index - 1)
    else goTo(index + 1)
  }

  function handlePointerCancel() {
    clearHoldTimer()
    setPaused(false)
    downX.current = null
  }

  if (!scene) return null

  return (
    <div className={s.viewer}>
      <div className={s.progressRow}>
        {scenes.map((sc, i) => (
          <div key={sc.id} className={s.segment}>
            {i < index && <div className={s.segmentFill} style={{ width: '100%' }} />}
            {i === index && autoAdvance && (
              <div
                className={`${s.segmentFill} ${s.segmentFillAnimating}`}
                style={{
                  animationDuration: `${duration}ms`,
                  animationPlayState: paused ? 'paused' : 'running',
                }}
                onAnimationEnd={() => goTo(index + 1)}
              />
            )}
            {i === index && !autoAdvance && (
              <div className={s.segmentFill} style={{ width: isLast ? '100%' : 0 }} />
            )}
          </div>
        ))}
      </div>

      <button className={s.closeBtn} onClick={onExit} aria-label="Fechar">
        <X size={20} />
      </button>

      <div key={scene.id} className={s.sceneWrap}>
        {scene.render({ paused })}
      </div>

      <div
        className={s.tapZones}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className={s.tapLeft} />
        <div className={s.tapRight} />
      </div>
    </div>
  )
}
