import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Target, Search, X, Minus, Lock } from 'lucide-react'
import {
  getGroupFinishedMatches,
  getGroupMatchPalpites,
  type GroupFinishedMatch,
  type MemberPalpite,
  type GroupMatchPalpites,
} from '@/services/bolaoService'
import { CountryBadge } from '@/components/CountryBadge'
import { PlayerModal } from '@/components/PlayerModal/PlayerModal'
import { phaseLabel, getPredBreakdown } from '@/utils/format'
import {
  shortDate, shortTime, avatarInitial, avatarColor,
  ALL_CAT_CSS, FINISHED_CAT_ORDER, LOCKED_CAT_ORDER,
  finishedCatConfig, lockedCatConfig, normalize,
} from '@/utils/palpitesConfig'
import s from './BolaoGrupoPalpites.module.css'

// ── helpers ───────────────────────────────────────────────────────────────────

function matchesSearch(m: GroupFinishedMatch, q: string) {
  const nq = normalize(q.trim())
  return normalize(m.homeTeam).includes(nq) || normalize(m.awayTeam).includes(nq)
}

// ── sub-components ────────────────────────────────────────────────────────────

function MemberCard({
  p, phase, isFinished, onCardClick,
}: {
  p: MemberPalpite
  phase: string
  isFinished: boolean
  onCardClick: () => void
}) {
  const css = ALL_CAT_CSS[p.category] ?? 'sempal'
  const bd = (isFinished && p.points !== null) ? getPredBreakdown(p.points, phase) : null
  const hasBonus = bd && bd.bonus > 0
  const hasPalpite = p.homeScore !== null && p.awayScore !== null

  return (
    <div className={`${s.card} ${s[`card_${css}`]}`} onClick={onCardClick}>
      <div className={s.cardAvatar} style={{ background: avatarColor(p.userId) }}>
        {avatarInitial(p.name)}
      </div>
      <span className={s.cardName}>{p.name}</span>
      <div className={s.cardRight}>
        <span className={s.cardScore}>
          {hasPalpite ? `${p.homeScore}×${p.awayScore}` : '—'}
        </span>
        {isFinished && hasBonus && p.points !== null ? (
          <div className={s.cardBonusRow}>
            <span className={`${s.cardBadge} ${s[`badge_${css}`]}`}>{`+${bd!.base}`}</span>
            <span className={bd!.modifier < 0 ? s.penaltyPill : s.bonusPill}>
              {bd!.drawBonus && <Minus size={7} strokeWidth={3} />}
              {bd!.modifier < 0 ? String(bd!.modifier) : `+${bd!.bonus}`}
            </span>
          </div>
        ) : isFinished && p.category !== 'sem_palpite' ? (
          <span className={`${s.cardBadge} ${s[`badge_${css}`]}`}>
            {p.points !== null ? `+${p.points}` : '0'}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function PalpitesView({
  data,
  onCardClick,
}: {
  data: GroupMatchPalpites
  onCardClick: (p: MemberPalpite) => void
}) {
  const { isFinished, match, palpites } = data
  const catOrder = isFinished ? FINISHED_CAT_ORDER : LOCKED_CAT_ORDER
  const catConfig = isFinished
    ? finishedCatConfig(match.phase)
    : lockedCatConfig(match.homeTeam, match.awayTeam)

  const groups = catOrder.map((cat) => ({
    cat,
    cfg: catConfig[cat] ?? { label: cat, pts: '', css: 'sempal' },
    items: palpites.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0)

  const total = palpites.length

  return (
    <div className={s.palpitesView}>
      {/* summary strip */}
      <div className={s.summaryStrip}>
        {catOrder.map((cat) => {
          const n = palpites.filter((p) => p.category === cat).length
          if (n === 0) return null
          const css = (catConfig[cat] ?? { css: 'sempal' }).css
          return (
            <div key={cat} className={`${s.stripChip} ${s[`chip_${css}`]}`}>
              <span className={s.stripNum}>{n}</span>
              <span className={s.stripLabel}>/{total}</span>
            </div>
          )
        })}
      </div>

      {/* groups */}
      {groups.map(({ cat, cfg, items }) => {
        const hasDrawBonus = isFinished && cat === 'resultado_certo' && items.some(
          p => p.points !== null && getPredBreakdown(p.points, match.phase)?.drawBonus
        )
        return (
          <div key={cat} className={s.catSection}>
            <div className={`${s.catHeader} ${s[`catHeader_${cfg.css}`]}`}>
              <span className={s.catTitle}>
                {cfg.label}
                {hasDrawBonus && <Minus size={10} strokeWidth={2.5} className={s.catTitleDrawIcon} />}
              </span>
              {cfg.pts && <span className={s.catPts}>{cfg.pts}</span>}
              <span className={s.catCount}>{items.length}</span>
            </div>
            <div className={s.cardGrid}>
              {items.map((p) => (
                <MemberCard
                  key={p.userId}
                  p={p}
                  phase={match.phase}
                  isFinished={isFinished}
                  onCardClick={() => onCardClick(p)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function BolaoGrupoPalpites() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [matches, setMatches]                 = useState<GroupFinishedMatch[]>([])
  const [selectedId, setSelectedId]           = useState<string | null>(null)
  const [palpites, setPalpites]               = useState<GroupMatchPalpites | null>(null)
  const [loadingMatches, setLoadingMatches]   = useState(true)
  const [loadingPalpites, setLoadingPalpites] = useState(false)
  const [groupName, setGroupName]             = useState('')
  const [search, setSearch]                   = useState('')
  const [selectedPlayer, setSelectedPlayer]   = useState<MemberPalpite | null>(null)
  const cacheRef = useRef<Record<string, GroupMatchPalpites>>({})

  useEffect(() => {
    const state = (window.history.state?.usr ?? window.history.state) as { groupName?: string } | undefined
    if (state?.groupName) setGroupName(state.groupName)
  }, [])

  const selectMatch = useCallback(async (matchId: string) => {
    setSelectedId(matchId)
    if (cacheRef.current[matchId]) {
      setPalpites(cacheRef.current[matchId])
      return
    }
    setLoadingPalpites(true)
    setPalpites(null)
    try {
      const data = await getGroupMatchPalpites(id!, matchId)
      cacheRef.current[matchId] = data
      setPalpites(data)
    } finally {
      setLoadingPalpites(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    let active = true
    async function load() {
      try {
        const res = await getGroupFinishedMatches(id!)
        if (!active) return
        setMatches(res.matches)
        if (res.matches.length > 0) selectMatch(res.matches[0].id)
      } catch {
        navigate(`/bolao/${id}`)
      } finally {
        if (active) setLoadingMatches(false)
      }
    }
    load()
    return () => { active = false }
  }, [id, navigate, selectMatch])

  const filtered = search.trim() ? matches.filter((m) => matchesSearch(m, search)) : matches
  const latestMatchId = matches[0]?.id ?? null

  useEffect(() => {
    if (!search.trim()) return
    if (filtered.length > 0 && !filtered.find((m) => m.id === selectedId)) {
      selectMatch(filtered[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const selectedMatch = matches.find((m) => m.id === selectedId)
  const isLatest = selectedId === latestMatchId

  if (loadingMatches) {
    return (
      <div className="app-layout">
        <div className="page fade-up">
          <p className={s.loadingPage}>Carregando…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <div className="page fade-up">

        {/* Header */}
        <div className={s.header}>
          <button className={s.backBtn} onClick={() => navigate(`/bolao/${id}`)}>
            <ArrowLeft size={20} />
          </button>
          <div className={s.headerInfo}>
            <h1 className={s.title}>Palpites do Grupo</h1>
            {groupName && <p className={s.subtitle}>{groupName}</p>}
          </div>
        </div>

        {matches.length === 0 ? (
          <div className={s.emptyState}>
            <Target size={40} strokeWidth={1.5} />
            <p>Nenhum palpite disponível ainda.</p>
            <span>Os palpites aparecem quando os jogos bloqueiam ou encerram.</span>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className={s.searchRow}>
              <Search size={15} className={s.searchIcon} />
              <input
                className={s.searchInput}
                placeholder="Buscar seleção..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className={s.searchClear} onClick={() => setSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Match selector chips */}
            {filtered.length === 0 ? (
              <p className={s.searchEmpty}>Nenhum jogo encontrado para "{search}"</p>
            ) : (
              <div className={s.chipWrapper}>
                <div className={s.chipScroll}>
                  {filtered.map((m) => {
                    const isLocked = m.predictionsLocked && m.status !== 'finished'
                    return (
                      <button
                        key={m.id}
                        className={`${s.chip} ${m.id === selectedId ? s.chipActive : ''} ${isLocked ? s.chipLocked : ''}`}
                        onClick={() => selectMatch(m.id)}
                      >
                        {m.id === latestMatchId && (
                          <span className={s.latestDot} title="Último jogo" />
                        )}
                        <CountryBadge country={m.homeTeam} size="xs" />
                        {isLocked ? (
                          <Lock size={9} className={s.chipLockIcon} />
                        ) : (
                          <span className={s.chipScore}>{m.homeScore}×{m.awayScore}</span>
                        )}
                        <CountryBadge country={m.awayTeam} size="xs" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Selected match info bar */}
            {selectedMatch && (
              <div className={s.matchBar}>
                <div className={s.matchBarTeams}>
                  <CountryBadge country={selectedMatch.homeTeam} size="sm" />
                  {selectedMatch.homeScore !== null && selectedMatch.awayScore !== null ? (
                    <span className={s.matchBarScore}>
                      {selectedMatch.homeScore} × {selectedMatch.awayScore}
                    </span>
                  ) : (
                    <span className={s.matchBarVs}>VS</span>
                  )}
                  <CountryBadge country={selectedMatch.awayTeam} size="sm" />
                </div>
                <div className={s.matchBarMeta}>
                  <div className={s.matchBarNameRow}>
                    <span className={s.matchBarTeamNames}>
                      {selectedMatch.homeTeam} · {selectedMatch.awayTeam}
                    </span>
                    {isLatest && (
                      <span className={s.latestBadge}>
                        {selectedMatch.status !== 'finished' ? 'Bloqueado' : 'Último jogo'}
                      </span>
                    )}
                  </div>
                  <span className={s.matchBarInfo}>
                    {phaseLabel(selectedMatch.phase)} · {shortDate(selectedMatch.matchDate)}
                    {selectedMatch.status !== 'finished' && (
                      <> · <span className={s.matchBarLockInfo}><Lock size={9} /> {shortTime(selectedMatch.matchDate)}</span></>
                    )}
                    {selectedMatch.penaltyWinner && (
                      <> · <span className={s.matchBarPen}>Classif.: {selectedMatch.penaltyWinner}</span></>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Predictions */}
            {loadingPalpites ? (
              <div className={s.loadingPalpites}>
                <div className={s.loadingBar} />
                <div className={s.loadingBar} style={{ width: '70%' }} />
                <div className={s.loadingBar} style={{ width: '85%' }} />
              </div>
            ) : palpites ? (
              <PalpitesView data={palpites} onCardClick={setSelectedPlayer} />
            ) : null}
          </>
        )}

      </div>

      {selectedPlayer && selectedMatch && (
        <PlayerModal
          player={selectedPlayer}
          match={selectedMatch}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
}
