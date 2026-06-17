import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { CountryBadge } from '@/components/CountryBadge'
import s from './PlayerModal.module.css'

function avatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#6366f1',
]

function avatarColor(userId: string) {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = userId.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const CAT_CONFIG: Record<string, { label: string; css: string }> = {
  cravou:          { label: 'Cravou!',           css: 'cravou'    },
  resultado_bonus: { label: 'Resultado + Bônus',  css: 'bonus'     },
  resultado_certo: { label: 'Resultado Certo',    css: 'resultado' },
  parcial:         { label: 'Gols de um time',    css: 'parcial'   },
  errou:           { label: 'Errou tudo',          css: 'errou'     },
  sem_palpite:     { label: 'Sem palpite',         css: 'sempal'    },
}

const MINI_PARTICLES = [
  { tx: '-62px', ty: '-72px', color: '#22c55e', size: 5 },
  { tx:  '62px', ty: '-72px', color: '#16a34a', size: 4 },
  { tx: '-84px', ty:   '0px', color: '#00D4FF', size: 6 },
  { tx:  '84px', ty:   '0px', color: '#22c55e', size: 4 },
  { tx: '-44px', ty:  '72px', color: '#16a34a', size: 5 },
  { tx:  '44px', ty:  '72px', color: '#00D4FF', size: 4 },
  { tx:   '0px', ty: '-88px', color: '#22c55e', size: 5 },
  { tx:   '0px', ty:  '88px', color: '#16a34a', size: 4 },
]

export interface PlayerModalData {
  userId: string
  name: string
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: string | null
  points: number | null
  category: string
}

export interface MatchContext {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  penaltyWinner: string | null
}

interface Props {
  player: PlayerModalData
  match: MatchContext
  onClose: () => void
}

export function PlayerModal({ player, match, onClose }: Props) {
  const cat = player.category
  const cfg = CAT_CONFIG[cat] ?? { label: cat, css: 'sempal' }
  const isBonus = cat === 'resultado_bonus'
  const isCravou = cat === 'cravou'
  const basePoints = isBonus && player.points !== null ? player.points - 2 : null
  const hasPalpite = player.homeScore !== null && player.awayScore !== null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className={s.overlay} onClick={onClose}>
      <div className={`${s.card} ${s[`card_${cfg.css}`]}`} onClick={(e) => e.stopPropagation()}>
        <button className={s.closeBtn} onClick={onClose}><X size={16} /></button>

        {/* Avatar + nome */}
        <div className={s.playerSection}>
          <div className={s.avatar} style={{ background: avatarColor(player.userId) }}>
            {avatarInitial(player.name)}
          </div>
          <div className={s.playerName}>{player.name}</div>
        </div>

        {/* Jogo */}
        <div className={s.matchSection}>
          <div className={s.matchTeams}>
            <CountryBadge country={match.homeTeam} size="sm" />
            <span className={s.matchScore}>{match.homeScore} × {match.awayScore}</span>
            <CountryBadge country={match.awayTeam} size="sm" />
          </div>
          <div className={s.matchNames}>{match.homeTeam} · {match.awayTeam}</div>
          {match.penaltyWinner && (
            <div className={s.matchPen}>Pênaltis: {match.penaltyWinner}</div>
          )}
        </div>

        {/* Palpite */}
        <div className={s.palpiteSection}>
          <div className={s.palpiteLabel}>Palpite</div>
          <div className={`${s.palpiteScore} ${isCravou ? s.palpiteScoreCravou : ''}`}>
            {hasPalpite ? `${player.homeScore} × ${player.awayScore}` : '—'}
          </div>
          {player.penaltyWinner && (
            <div className={s.palpitePen}>Pen: {player.penaltyWinner}</div>
          )}

          {/* Badge com animação por categoria */}
          <div className={`${s.catBadge} ${s[`catBadge_${cfg.css}`]}`}>
            {isCravou && (
              <div className={s.miniParticles}>
                {MINI_PARTICLES.map((p, i) => (
                  <span
                    key={i}
                    className={s.miniParticle}
                    style={{
                      '--tx': p.tx,
                      '--ty': p.ty,
                      '--delay': `${i * 0.04}s`,
                      background: p.color,
                      width: p.size,
                      height: p.size,
                      borderRadius: i % 3 === 0 ? '2px' : '50%',
                    } as React.CSSProperties}
                  />
                ))}
              </div>
            )}
            <span className={s.catLabel}>{cfg.label}</span>
            {isBonus && basePoints !== null ? (
              <span className={s.catPts}>+{basePoints} <span className={s.bonusExtra}>+2★</span></span>
            ) : (
              player.points !== null && cat !== 'sem_palpite' && (
                <span className={s.catPts}>+{player.points} pts</span>
              )
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
