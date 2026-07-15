import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { Crown } from 'lucide-react'
import type { RankingEntry } from '@/services/cravouService'
import { avatarInitial } from '@/utils/palpitesConfig'
import s from './PodiumScene.module.css'

type Place = 1 | 2 | 3
type Phase = 'caption' | 'suspense' | 'revealed'

interface Props {
  place: Place
  entry: RankingEntry
  meId: string | null
}

const CAPTION_MS: Record<Place, number> = { 3: 1800, 2: 2100, 1: 2400 }
const SUSPENSE_MS: Record<Place, number> = { 3: 2000, 2: 2600, 1: 3400 }
const CAPTION_TEXT: Record<Place, string> = {
  3: 'E o terceiro lugar vai para...',
  2: 'Prepare-se... o segundo lugar é...',
  1: 'E o grande campeão da Copa é...',
}
const PLACE_LABEL: Record<Place, string> = { 3: '3º Lugar', 2: '2º Lugar', 1: '1º Lugar' }
const PLACE_CLASS: Record<Place, string> = { 3: s.third, 2: s.second, 1: s.first }
const CONFETTI_COLORS: Record<Place, string[]> = {
  3: ['#92400e', '#b45309', '#fbbf24'],
  2: ['#9ca3af', '#e5e7eb', '#ffffff'],
  1: ['#f59e0b', '#fbbf24', '#ffffff'],
}
const CONFETTI_PARTICLES: Record<Place, number> = { 3: 40, 2: 60, 1: 100 }
const VIBRATION: Record<Place, number[]> = { 3: [12, 20], 2: [15, 30, 15], 1: [20, 40, 20, 40, 20] }
const BURST_EMOJIS: Record<Place, string[]> = {
  3: ['🎉', '🎊', '✨', '🥉'],
  2: ['🎉', '🎊', '✨', '🥈', '⭐'],
  1: ['🎉', '🏆', '✨', '🎊', '⭐', '🔥'],
}
const BURST_COUNT: Record<Place, number> = { 3: 8, 2: 11, 1: 16 }

// Dispara uma "explosão" de confete em várias ondas (centro + dois canhões
// laterais), em vez de um único burst — fica bem mais parecido com festa de
// verdade do que uma chamada isolada de confetti().
function fireConfetti(place: Place) {
  const colors = CONFETTI_COLORS[place]
  const base = CONFETTI_PARTICLES[place]

  confetti({ particleCount: base, spread: 75 + place * 10, startVelocity: 32 + place * 5, origin: { y: 0.55 }, colors, shapes: ['star', 'circle'], scalar: 1.1 })

  window.setTimeout(() => {
    confetti({ particleCount: Math.round(base * 0.5), angle: 60, spread: 55, origin: { x: 0.1, y: 0.65 }, colors })
    confetti({ particleCount: Math.round(base * 0.5), angle: 120, spread: 55, origin: { x: 0.9, y: 0.65 }, colors })
  }, 180)

  if (place >= 2) {
    window.setTimeout(() => {
      confetti({ particleCount: Math.round(base * 0.7), spread: 100, startVelocity: 40, origin: { y: 0.5 }, colors, shapes: ['star'], scalar: 1.2 })
    }, 380)
  }
}

// Fileira de emojis voando radialmente a partir do centro do card (não do
// avatar pequeno) — cobre bem mais espaço na tela e parece uma explosão real.
function buildBurst(place: Place) {
  const emojis = BURST_EMOJIS[place]
  const count = BURST_COUNT[place]
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI + (place === 1 ? 0.2 : 0)
    const radius = 90 + (i % 3) * 30
    return {
      emoji: emojis[i % emojis.length],
      tx: `${Math.round(Math.cos(angle) * radius)}px`,
      ty: `${Math.round(Math.sin(angle) * radius * 0.8 - 20)}px`,
      delay: `${(i * 0.025).toFixed(3)}s`,
      size: 16 + (i % 3) * 6,
    }
  })
}

export default function PodiumScene({ place, entry, meId }: Props) {
  const [phase, setPhase] = useState<Phase>('caption')
  const firedFx = useRef(false)
  const burst = useMemo(() => buildBurst(place), [place])

  // Cada lugar (3º/2º/1º) é uma cena própria no StoryViewer e remonta ao ser exibida
  // (key={scene.id}), então o estado já nasce zerado — não precisa resetar aqui.
  useEffect(() => {
    const t = setTimeout(() => setPhase('suspense'), CAPTION_MS[place])
    return () => clearTimeout(t)
  }, [place])

  useEffect(() => {
    if (phase !== 'suspense') return
    const t = setTimeout(() => setPhase('revealed'), SUSPENSE_MS[place])
    return () => clearTimeout(t)
  }, [phase, place])

  useEffect(() => {
    if (phase !== 'revealed' || firedFx.current) return
    firedFx.current = true
    fireConfetti(place)
    navigator.vibrate?.(VIBRATION[place])
  }, [phase, place])

  const isMe = entry.userId === meId
  const revealed = phase === 'revealed'

  return (
    <div className={`${s.card} ${PLACE_CLASS[place]}`}>
      <div className={`${s.caption} ${phase === 'caption' ? s.captionIn : s.captionOut}`}>
        {CAPTION_TEXT[place]}
      </div>

      {phase !== 'caption' && (
        <>
          <div className={s.label}>{PLACE_LABEL[place]}</div>

          {revealed && <div className={s.flash} />}

          <div className={`${s.avatarRing} ${revealed ? s.revealed : s.suspense}`}>
            <div className={s.avatar}>{revealed ? avatarInitial(entry.name) : '?'}</div>
            {place === 1 && revealed && <Crown className={s.crown} size={22} />}
          </div>

          {revealed && (
            <div className={s.burstWrap} aria-hidden="true">
              {burst.map((p, i) => (
                <span
                  key={i}
                  className={s.burstEmoji}
                  style={{ '--tx': p.tx, '--ty': p.ty, '--delay': p.delay, fontSize: p.size } as React.CSSProperties}
                >
                  {p.emoji}
                </span>
              ))}
            </div>
          )}

          <div className={`${s.details} ${revealed ? s.detailsIn : ''}`}>
            <div className={s.name}>{entry.name}{isMe ? ' (você)' : ''}</div>
            <div className={s.points}>{entry.points} <span>pts</span></div>
            <div className={s.cravadas}>{entry.cravadas} cravadas</div>
          </div>

          {!revealed && <div className={s.hint}>Quem será?</div>}
        </>
      )}
    </div>
  )
}
