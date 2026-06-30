import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Minus } from 'lucide-react'
import { CountryBadge } from '@/components/CountryBadge'
import { getPredBreakdown } from '@/utils/format'
import { avatarInitial, avatarColor } from '@/utils/palpitesConfig'
import s from './PlayerModal.module.css'

const CAT_CONFIG: Record<string, { label: string; css: string }> = {
  cravou:          { label: 'Cravou!',           css: 'cravou'    },
  resultado_bonus: { label: 'Resultado + Bônus',  css: 'bonus'     },
  resultado_certo: { label: 'Resultado Certo',    css: 'resultado' },
  parcial:         { label: 'Gols de um time',    css: 'parcial'   },
  errou:           { label: 'Errou tudo',          css: 'errou'     },
  sem_palpite:     { label: 'Sem palpite',         css: 'sempal'    },
  vitoria_casa:    { label: 'Vitória mandante',    css: 'vitoriacasa' },
  vitoria_fora:    { label: 'Vitória visitante',   css: 'vitoriafora' },
  empate:          { label: 'Empate',              css: 'empate'    },
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
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: string | null
  phase: string
}

interface Props {
  player: PlayerModalData
  match: MatchContext
  onClose: () => void
}

export function PlayerModal({ player, match, onClose }: Props) {
  const cat = player.category
  const cfg = CAT_CONFIG[cat] ?? { label: cat, css: 'sempal' }
  const isCravou = cat === 'cravou'
  const hasPalpite = player.homeScore !== null && player.awayScore !== null

  const isKnockout = match.phase !== 'group_stage'
  const needsBreakdown = cat === 'resultado_bonus' || cat === 'resultado_certo' ||
    (cat === 'cravou' && isKnockout && (player.points === 14 || player.points === 17))
  const bd = needsBreakdown && player.points !== null
    ? getPredBreakdown(player.points, match.phase)
    : null
  const hasBonus = bd !== null && bd.bonus > 0
  const effectiveLabel = hasBonus && cat === 'resultado_certo' && bd?.drawBonus
    ? 'Empate Acertado'
    : cat === 'vitoria_casa' ? `Vitória ${match.homeTeam}`
    : cat === 'vitoria_fora' ? `Vitória ${match.awayTeam}`
    : cfg.label

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
            <span className={s.matchScore}>
              {match.homeScore !== null && match.awayScore !== null
                ? `${match.homeScore} × ${match.awayScore}`
                : 'VS'
              }
            </span>
            <CountryBadge country={match.awayTeam} size="sm" />
          </div>
          <div className={s.matchNames}>{match.homeTeam} · {match.awayTeam}</div>
          {match.penaltyWinner && (
            <div className={s.matchPen}>Classif.: {match.penaltyWinner}</div>
          )}
        </div>

        {/* Palpite */}
        <div className={s.palpiteSection}>
          <div className={s.palpiteLabel}>Palpite</div>
          <div className={`${s.palpiteScore} ${isCravou ? s.palpiteScoreCravou : ''}`}>
            {hasPalpite ? `${player.homeScore} × ${player.awayScore}` : '—'}
          </div>
          {player.penaltyWinner && (
            <div className={s.palpitePen}>Classif.: {player.penaltyWinner}</div>
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
            <span className={s.catLabel}>{effectiveLabel}</span>
            {hasBonus && bd ? (
              <span className={s.catPts}>
                +{bd.base}{' '}
                <span className={bd.modifier < 0 ? s.penaltyExtra : s.bonusExtra}>
                  {bd.drawBonus && <Minus size={8} strokeWidth={3} />}
                  {bd.modifier < 0 ? String(bd.modifier) : `+${bd.bonus}`}
                  {bd.modifier < 0 ? ' pen' : ' bônus'}
                </span>
              </span>
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
