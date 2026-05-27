import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Zap, Clock, Target, CheckCircle2, XCircle } from 'lucide-react'
import { getMatches, getMyPredictions, type Match, type Prediction } from '@/services/cravouService'
import { formatMatchDate, formatTimeUntil, isWithinMinutes, phaseLabel, getPredCategory, type PredCategory } from '@/utils/format'
import { CountryBadge } from '@/components/CountryBadge'
import { SoccerBall } from '@/components/icons/SoccerBall'
import { useSocketEvent } from '@/hooks/useSocketEvent'
import s from './Matches.module.css'

const FILTERS = [
  { label: 'Todos',      value: '' },
  { label: 'Ao vivo',   value: 'live' },
  { label: 'Grupos',    value: 'group_stage' },
  { label: 'Mata-mata', value: 'round_of_32' },
  { label: 'Encerrados', value: 'finished' },
]

export default function Matches() {
  const [matches, setMatches]     = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Map<string, Prediction>>(new Map())
  const [filter, setFilter]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [, setTick]               = useState(0)

  const load = useCallback(async () => {
    const [all, preds] = await Promise.all([
      getMatches().catch(() => []),
      getMyPredictions().catch(() => []),
    ])
    setMatches(all)
    setPredictions(new Map(preds.map((p) => [p.matchId, p])))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useSocketEvent('match:updated', load)
  useSocketEvent('match:locked', load)

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 15_000)
    return () => clearInterval(iv)
  }, [])

  const filtered = matches.filter((m) => {
    if (!filter) return true
    if (filter === 'live')        return m.status === 'live' || m.status === 'awaiting_result'
    if (filter === 'finished')    return m.status === 'finished'
    if (filter === 'round_of_32') return m.phase !== 'group_stage'
    return m.phase === filter
  })

  const liveCount = matches.filter(
    (m) => m.status === 'live' || m.status === 'awaiting_result'
  ).length

  return (
    <div className="app-layout">
      <div className="page">
        <div className={s.header}>
          <div className={s.title}>Jogos</div>
          <div className={s.filters}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`${s.filter} ${filter === f.value ? s.active : ''} ${f.value === 'live' && filter !== 'live' && liveCount > 0 ? s.filterLiveAlert : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.value === 'live' && liveCount > 0 ? (
                  <><span className={s.filterLiveDot} />{f.label}<span className={s.filterBadge}>{liveCount}</span></>
                ) : f.label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.list}>
          {loading && [1,2,3,4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 130 }} />
          ))}
          {!loading && filtered.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyIcon}><SoccerBall size={40} /></div>
              Nenhum jogo encontrado
            </div>
          )}
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} prediction={predictions.get(m.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── MatchCard ──────────────────────────────────────────────────────────────────

function MatchCard({ match: m, prediction: pred }: { match: Match; prediction?: Prediction }) {
  const hasScore   = m.homeScore !== null && m.awayScore !== null
  const isOpen     = m.status === 'upcoming' && !m.predictionsLocked
  const isWaiting  = m.status === 'upcoming' && m.predictionsLocked
  const isLive     = m.status === 'live'
  const isCalc     = m.status === 'awaiting_result'
  const isFinished = m.status === 'finished'

  const closingSoon     = isOpen && isWithinMinutes(m.matchDate, 60)
  const closingVerySoon = isOpen && isWithinMinutes(m.matchDate, 30)

  const cat: PredCategory = isFinished
    ? getPredCategory(pred?.points, !!pred)
    : 'none'

  const cardExtra = [
    isLive     ? s.cardLive     : '',
    isCalc     ? s.cardCalc     : '',
    isWaiting  ? s.cardWaiting  : '',
    isFinished && cat === 'exact'   ? s.cardExact   : '',
    isFinished && cat === 'right'   ? s.cardRight   : '',
    isFinished && cat === 'partial' ? s.cardPartial : '',
    isFinished && cat === 'wrong'   ? s.cardWrong   : '',
    isFinished && cat === 'none'    ? s.cardNoP     : '',
    closingVerySoon ? s.cardUrgent  : '',
  ].filter(Boolean).join(' ')

  return (
    <Link to={`/matches/${m.id}`} className={`${s.card} ${cardExtra}`}>
      {/* Topo */}
      <div className={s.cardTop}>
        <span className={s.groupTag}>
          {m.groupName ? `Grupo ${m.groupName} · R${m.groupRound}` : phaseLabel(m.phase)}
        </span>
        <StatusChip match={m} closingSoon={closingSoon} closingVerySoon={closingVerySoon} />
      </div>

      {/* Times + placar */}
      <div className={s.cardBody}>
        <div className={s.team}>
          <CountryBadge country={m.homeTeam} size="md" />
          <div className={s.teamName}>{m.homeTeam}</div>
        </div>

        <div className={s.middle}>
          {hasScore ? (
            <div className={s.scoreRow}>
              <span className={`${s.scoreNum} ${isLive ? s.scoreNumLive : ''}`}>{m.homeScore}</span>
              <span className={s.scoreSep}>–</span>
              <span className={`${s.scoreNum} ${isLive ? s.scoreNumLive : ''}`}>{m.awayScore}</span>
            </div>
          ) : (
            <div className={s.vs}>VS</div>
          )}
          <div className={s.dateTime}>{formatMatchDate(m.matchDate)}</div>
        </div>

        <div className={`${s.team} ${s.teamAway}`}>
          <CountryBadge country={m.awayTeam} size="md" />
          <div className={s.teamName}>{m.awayTeam}</div>
        </div>
      </div>

      {/* Linha do palpite */}
      <PredRow match={m} pred={pred} cat={cat} isCalc={isCalc} />
    </Link>
  )
}

function StatusChip({ match: m, closingSoon, closingVerySoon }: { match: Match; closingSoon: boolean; closingVerySoon: boolean }) {
  if (m.status === 'live') return (
    <span className={`${s.chip} ${s.chipLive}`}>
      <span className={s.chipDot} /> Ao vivo
    </span>
  )
  if (m.status === 'awaiting_result') return (
    <span className={`${s.chip} ${s.chipCalc}`}>
      <span className={s.chipSpinner} /> Calculando
    </span>
  )
  if (m.status === 'finished') return (
    <span className={`${s.chip} ${s.chipDone}`}>Encerrado</span>
  )
  if (m.predictionsLocked) return (
    <span className={`${s.chip} ${s.chipLocked}`}><Lock size={10} /> Aguardando início</span>
  )
  if (closingVerySoon) return (
    <span className={`${s.chip} ${s.chipUrgent}`}><Zap size={10} /> Fecha em {formatTimeUntil(m.matchDate)}</span>
  )
  if (closingSoon) return (
    <span className={`${s.chip} ${s.chipWarn}`}><Clock size={10} /> Fecha em {formatTimeUntil(m.matchDate)}</span>
  )
  return <span className={`${s.chip} ${s.chipDefault}`}>Agendado</span>
}

function PredRow({ match: m, pred, cat, isCalc }: { match: Match; pred?: Prediction; cat: PredCategory; isCalc: boolean }) {
  const finished = m.status === 'finished' && !!pred

  const rowBg: Record<PredCategory, string>    = { exact: s.rowExact, right: s.rowRight, partial: s.rowPartial, wrong: s.rowWrong, none: '' }
  const scoreCol: Record<PredCategory, string> = { exact: s.predScoreExact, right: s.predScoreRight, partial: s.predScorePartial, wrong: s.predScoreWrong, none: '' }
  const ptsCol: Record<PredCategory, string>   = { exact: s.predPtsExact,   right: s.predPtsRight,   partial: s.predPtsPartial,   wrong: s.predPtsWrong,   none: '' }

  const catIcon: Record<PredCategory, React.ReactNode> = {
    exact:   <Target size={11} />,
    right:   <CheckCircle2 size={11} />,
    partial: <SoccerBall size={11} />,
    wrong:   <XCircle size={11} />,
    none:    null,
  }

  return (
    <div className={`${s.predRow} ${finished ? rowBg[cat] : ''}`}>
      <span className={s.predLabel}>Seu palpite</span>
      {pred ? (
        <div className={s.predRight_}>
          <span className={`${s.predScore} ${finished ? scoreCol[cat] : ''}`}>
            {pred.homeScore} × {pred.awayScore}
          </span>
          {finished && pred.points !== null && (
            <span className={`${s.predPts} ${ptsCol[cat]}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {catIcon[cat]} {pred.points > 0 ? `+${pred.points} pts` : '0 pts'}
            </span>
          )}
          {isCalc && pred.points === null && (
            <span className={s.predCalcText}>calculando...</span>
          )}
        </div>
      ) : (
        <span className={s.noPred}>
          {m.status === 'upcoming' && !m.predictionsLocked ? 'Palpitar →' : '—'}
        </span>
      )}
    </div>
  )
}
