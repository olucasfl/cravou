import { useEffect, useState, useCallback } from 'react'
import { Target, Search, X, Minus, Lock } from 'lucide-react'
import {
  getGlobalFinishedMatches,
  getGlobalMatchPalpites,
  type GlobalMatch,
  type GlobalMatchPalpites,
  type GlobalPalpite,
} from '@/services/cravouService'
import { CountryBadge } from '@/components/CountryBadge'
import { PlayerModal } from '@/components/PlayerModal/PlayerModal'
import { phaseLabel, getPredBreakdown } from '@/utils/format'
import {
  shortDate, shortTime, avatarInitial, avatarColor,
  ALL_CAT_CSS, FINISHED_CAT_ORDER, LOCKED_CAT_ORDER,
  finishedCatConfig, lockedCatConfig, normalize,
} from '@/utils/palpitesConfig'
import s from './GlobalPalpitesTab.module.css'

// ── helpers ───────────────────────────────────────────────────────────────────

function matchesSearch(m: GlobalMatch, q: string) {
  const nq = normalize(q.trim())
  return normalize(m.homeTeam).includes(nq) || normalize(m.awayTeam).includes(nq)
}

// ── sub-components ────────────────────────────────────────────────────────────

function MemberCard({
  p, phase, isFinished, onCardClick,
}: {
  p: GlobalPalpite
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
  data: GlobalMatchPalpites
  onCardClick: (p: GlobalPalpite) => void
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

// ── module-level cache (survives tab switches) ────────────────────────────────

let _cachedMatches: GlobalMatch[] | null = null
const _palpitesCache: Record<string, GlobalMatchPalpites> = {}

// ── main component ────────────────────────────────────────────────────────────

export default function GlobalPalpitesTab() {
  const [matches, setMatches]                 = useState<GlobalMatch[]>(_cachedMatches ?? [])
  const [selectedId, setSelectedId]           = useState<string | null>(null)
  const [palpites, setPalpites]               = useState<GlobalMatchPalpites | null>(null)
  const [loadingMatches, setLoadingMatches]   = useState(_cachedMatches === null)
  const [loadingPalpites, setLoadingPalpites] = useState(false)
  const [search, setSearch]                   = useState('')
  const [selectedPlayer, setSelectedPlayer]   = useState<GlobalPalpite | null>(null)

  const selectMatch = useCallback(async (matchId: string) => {
    setSelectedId(matchId)
    if (_palpitesCache[matchId]) {
      setPalpites(_palpitesCache[matchId])
      return
    }
    setLoadingPalpites(true)
    setPalpites(null)
    try {
      const data = await getGlobalMatchPalpites(matchId)
      if (data.isFinished) _palpitesCache[matchId] = data
      setPalpites(data)
    } finally {
      setLoadingPalpites(false)
    }
  }, [])

  useEffect(() => {
    if (_cachedMatches !== null) {
      if (_cachedMatches.length > 0) selectMatch(_cachedMatches[0].id)
      return
    }
    let active = true
    async function load() {
      try {
        const res = await getGlobalFinishedMatches()
        if (!active) return
        _cachedMatches = res.matches
        setMatches(res.matches)
        if (res.matches.length > 0) selectMatch(res.matches[0].id)
      } finally {
        if (active) setLoadingMatches(false)
      }
    }
    load()
    return () => { active = false }
  }, [selectMatch])

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
      <div className={s.loadingPalpites}>
        <div className={s.loadingBar} />
        <div className={s.loadingBar} style={{ width: '70%' }} />
        <div className={s.loadingBar} style={{ width: '85%' }} />
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className={s.emptyState}>
        <Target size={40} strokeWidth={1.5} />
        <p>Nenhum palpite disponível ainda.</p>
        <span>Os palpites aparecem quando os jogos bloqueiam ou encerram.</span>
      </div>
    )
  }

  return (
    <>
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
                  {m.id === latestMatchId && <span className={s.latestDot} />}
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
              {isLatest && <span className={s.latestBadge}>
                {selectedMatch.status !== 'finished' ? 'Bloqueado' : 'Último jogo'}
              </span>}
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

      {loadingPalpites ? (
        <div className={s.loadingPalpites}>
          <div className={s.loadingBar} />
          <div className={s.loadingBar} style={{ width: '70%' }} />
          <div className={s.loadingBar} style={{ width: '85%' }} />
        </div>
      ) : palpites ? (
        <PalpitesView data={palpites} onCardClick={setSelectedPlayer} />
      ) : null}

      {selectedPlayer && selectedMatch && (
        <PlayerModal
          player={selectedPlayer}
          match={selectedMatch}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  )
}
