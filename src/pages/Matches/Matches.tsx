import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Zap, Clock, Target, CheckCircle2, XCircle, Search, X, Minus, Trophy } from 'lucide-react'
import { type Match, type Prediction } from '@/services/cravouService'
import { formatMatchDate, formatTimeUntilClose, isWithinMinutes, phaseLabel, getPredCategory, getPredBreakdown, type PredCategory } from '@/utils/format'
import { CountryBadge } from '@/components/CountryBadge'
import { SoccerBall } from '@/components/icons/SoccerBall'
import { useAppData } from '@/context/AppDataContext'
import PullToRefresh from '@/components/PullToRefresh/PullToRefresh'
import s from './Matches.module.css'

const STATUS_TABS = [
  { label: 'Todos',      value: '' },
  { label: 'Agendado',   value: 'upcoming' },
  { label: 'Calculando', value: 'awaiting_result' },
  { label: 'Encerrado',  value: 'finished' },
]

const CAT_CHIPS = [
  { label: 'Grupos',    value: 'group_stage' },
  { label: 'Mata-mata', value: 'knockout' },
  { label: 'Ao vivo',   value: 'live' },
  { label: 'Palpitei',  value: 'palpitei' },
]

const STATUS_ORDER: Record<string, number> = {
  live: 0, awaiting_result: 1, upcoming: 2, finished: 3,
}

export default function Matches() {
  const { matches, predictions: predList, loading, refresh } = useAppData()

  const predictions = new Map(predList.map((p) => [p.matchId, p]))

  const [statusFilter, setStatusFilter] = useState('')
  const [catFilter, setCatFilter]       = useState('')
  const [searchOpen, setSearchOpen]     = useState(false)
  const [searchQuery, setSearchQuery]   = useState('')
  const searchRef                       = useRef<HTMLInputElement>(null)

  const q = searchQuery.trim().toLowerCase()

  const sorted = [...matches]
    .filter((m) => {
      if (q) return m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q)
      if (statusFilter === 'upcoming')        return m.status === 'upcoming'
      if (statusFilter === 'awaiting_result') return m.status === 'awaiting_result'
      if (statusFilter === 'finished')        return m.status === 'finished'
      return true
    })
    .filter((m) => {
      if (q) return true
      if (catFilter === 'group_stage') return m.phase === 'group_stage'
      if (catFilter === 'knockout')    return m.phase !== 'group_stage'
      if (catFilter === 'live')        return m.status === 'live'
      if (catFilter === 'palpitei')    return predictions.has(m.id)
      return true
    })
    .sort((a, b) => {
      const isAllFilter = !q && statusFilter === ''
      if (isAllFilter) return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      const so = (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2)
      if (so !== 0) return so
      return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    })

  function openSearch() {
    setSearchOpen(true)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  function closeSearch() {
    setSearchQuery('')
    setSearchOpen(false)
  }

  const liveCount = matches.filter((m) => m.status === 'live').length
  const calcCount = matches.filter((m) => m.status === 'awaiting_result').length
  const predCount = matches.filter((m) => predictions.has(m.id)).length

  function toggleStatus(val: string) {
    setStatusFilter(prev => prev === val ? '' : val)
  }
  function toggleCat(val: string) {
    setCatFilter(prev => prev === val ? '' : val)
  }

  return (
    <PullToRefresh onRefresh={refresh}>
      <div className="app-layout">
        <div className="page">
          <div className={s.header}>
            {/* Título + ícone busca */}
            <div className={s.titleRow}>
              {searchOpen ? (
                <div className={s.searchBar}>
                  <Search size={15} className={s.searchIcon} />
                  <input
                    ref={searchRef}
                    className={s.searchInput}
                    placeholder="Buscar por país..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className={s.searchClose} onClick={closeSearch}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className={s.title}>Jogos</div>
                  <button className={s.searchToggle} onClick={openSearch}>
                    <Search size={18} />
                  </button>
                </>
              )}
            </div>

            {/* ── Filtros (ocultos durante busca) ── */}
            {!searchOpen && (
              <>
                <div className={s.statusRow}>
                  {STATUS_TABS.map((t) => {
                    const isCalc = t.value === 'awaiting_result'
                    const count  = isCalc ? calcCount : 0
                    const alert  = count > 0 && statusFilter !== t.value
                    return (
                      <button
                        key={t.value}
                        className={[
                          s.statusTab,
                          statusFilter === t.value ? s.statusTabActive : '',
                          isCalc && alert ? s.statusTabCalc : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => toggleStatus(t.value)}
                      >
                        {t.label}
                        {isCalc && count > 0 && <span className={`${s.statusBadge} ${s.statusBadgeCalc}`}>{count}</span>}
                      </button>
                    )
                  })}
                </div>

                <div className={s.catRow}>
                  {CAT_CHIPS.map((c) => {
                    const isLive = c.value === 'live'
                    const isPalp = c.value === 'palpitei'
                    const count  = isLive ? liveCount : isPalp ? predCount : 0
                    const active = catFilter === c.value
                    return (
                      <button
                        key={c.value}
                        className={[
                          s.catChip,
                          active && isLive  ? s.catChipActiveLive : '',
                          active && isPalp  ? s.catChipActivePalp : '',
                          active && !isLive && !isPalp ? s.catChipActive : '',
                          !active && isLive && liveCount > 0 ? s.catChipLiveAlert : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => toggleCat(c.value)}
                      >
                        {isLive && liveCount > 0 && !active && <span className={s.liveDot} />}
                        {c.label}
                        {count > 0 && (
                          <span className={[
                            s.catBadge,
                            isLive ? s.catBadgeLive : '',
                            isPalp ? s.catBadgePalp : '',
                          ].filter(Boolean).join(' ')}>{count}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <div className={s.list}>
            {loading && [1,2,3,4,5].map((i) => (
              <div key={i} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: '12px 14px', borderLeft: '3px solid var(--c-border)' }}>
                <div className="skeleton" style={{ width: 80, height: 10, borderRadius: 99, marginBottom: 12 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }} />
                  <div className="skeleton" style={{ flex: 1, height: 13, borderRadius: 99 }} />
                  <div className="skeleton" style={{ width: 52, height: 28, borderRadius: 10, flexShrink: 0 }} />
                  <div className="skeleton" style={{ flex: 1, height: 13, borderRadius: 99 }} />
                  <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }} />
                </div>
                <div className="skeleton" style={{ width: '50%', height: 10, borderRadius: 99, marginTop: 12 }} />
              </div>
            ))}
            {!loading && sorted.length === 0 && (
              <div className={s.empty}>
                <div className={s.emptyIcon}><SoccerBall size={40} /></div>
                Nenhum jogo encontrado
              </div>
            )}
            {sorted.map((m) => (
              <MatchCard key={m.id} match={m} prediction={predictions.get(m.id)} />
            ))}
          </div>
        </div>
      </div>
    </PullToRefresh>
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
  const closingVerySoon = isOpen && isWithinMinutes(m.matchDate, 10)

  const cat: PredCategory = isFinished
    ? getPredCategory(pred?.points, !!pred, m.phase)
    : 'none'

  const cardExtra = [
    isLive     ? s.cardLive     : '',
    isCalc     ? s.cardCalc     : '',
    isWaiting  ? s.cardWaiting  : '',
    isFinished && (cat === 'exact' || cat === 'exact_bonus' || cat === 'exact_penalty') ? s.cardExact   : '',
    isFinished && cat === 'bonus'   ? s.cardBonus   : '',
    isFinished && (cat === 'right' || cat === 'bonus_penalty') ? s.cardRight : '',
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
    <span className={`${s.chip} ${s.chipUrgent}`}><Zap size={10} /> Fecha em {formatTimeUntilClose(m.matchDate)}</span>
  )
  if (closingSoon) return (
    <span className={`${s.chip} ${s.chipWarn}`}><Clock size={10} /> Fecha em {formatTimeUntilClose(m.matchDate)}</span>
  )
  return <span className={`${s.chip} ${s.chipDefault}`}>Agendado</span>
}

function PredRow({ match: m, pred, cat, isCalc }: { match: Match; pred?: Prediction; cat: PredCategory; isCalc: boolean }) {
  const finished = m.status === 'finished' && !!pred

  const rowBg: Record<PredCategory, string>    = {
    exact: s.rowExact, exact_bonus: s.rowExact, exact_penalty: s.rowExact,
    bonus: s.rowBonus, bonus_penalty: s.rowRight,
    right: s.rowRight, partial: s.rowPartial, wrong: s.rowWrong, none: '',
  }
  const scoreCol: Record<PredCategory, string> = {
    exact: s.predScoreExact, exact_bonus: s.predScoreExact, exact_penalty: s.predScoreExact,
    bonus: s.predScoreBonus, bonus_penalty: s.predScoreRight,
    right: s.predScoreRight, partial: s.predScorePartial, wrong: s.predScoreWrong, none: '',
  }
  const ptsCol: Record<PredCategory, string>   = {
    exact: s.predPtsExact, exact_bonus: s.predPtsExact, exact_penalty: s.predPtsExact,
    bonus: s.predPtsBonus, bonus_penalty: s.predPtsRight,
    right: s.predPtsRight, partial: s.predPtsPartial, wrong: s.predPtsWrong, none: '',
  }

  const catIcon: Record<PredCategory, React.ReactNode> = {
    exact:         <Target size={11} />,
    exact_bonus:   <Target size={11} />,
    exact_penalty: <Target size={11} />,
    bonus:         <Zap size={11} />,
    bonus_penalty: <Minus size={11} />,
    right:         <CheckCircle2 size={11} />,
    partial:       <SoccerBall size={11} />,
    wrong:         <XCircle size={11} />,
    none:          null,
  }

  return (
    <div className={`${s.predRow} ${finished ? rowBg[cat] : ''}`}>
      <span className={s.predLabel}>Seu palpite</span>
      {pred ? (
        <div className={s.predRight_}>
          <span className={`${s.predScore} ${finished ? scoreCol[cat] : ''}`}>
            {pred.homeScore} × {pred.awayScore}
          </span>
          {m.phase !== 'group_stage' && pred.penaltyWinner && (
            <span className={s.predClassified}>
              <Trophy size={9} /> {pred.penaltyWinner}
            </span>
          )}
          {finished && pred.points !== null ? (() => {
            const CATS_WITH_BD: PredCategory[] = ['right', 'bonus', 'exact_bonus', 'exact_penalty', 'bonus_penalty']
            const bd = CATS_WITH_BD.includes(cat)
              ? getPredBreakdown(pred.points, m.phase)
              : null
            const displayPts = bd ? bd.base : pred.points
            return (
              <span className={`${s.predPts} ${ptsCol[cat]}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {catIcon[cat]} {displayPts > 0 ? `+${displayPts}` : '0'}
                {bd && bd.bonus > 0 ? (
                  <span className={bd.modifier < 0 ? s.penaltyTag : s.bonusTag}>
                    {bd.drawBonus && <Minus size={7} strokeWidth={3} />}
                    {bd.modifier < 0 ? String(bd.modifier) : `+${bd.bonus}`}
                    {bd.modifier < 0 ? ' pen' : ' bônus'}
                  </span>
                ) : null}
                {' pts'}
              </span>
            )
          })() : null}
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
