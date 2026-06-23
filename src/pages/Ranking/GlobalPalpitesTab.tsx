import { useEffect, useState, useCallback } from 'react'
import { Target, Search, X, Minus, Lock, Radio } from 'lucide-react'
import {
  getGlobalPalpitavelMatches,
  getGlobalMatchPalpitesLive,
  type PalpitableMatch,
  type PalpitableMatchPalpites,
  type PalpitableGlobalPalpite,
  type GlobalPalpiteCategory,
} from '@/services/cravouService'
import { CountryBadge } from '@/components/CountryBadge'
import { PlayerModal } from '@/components/PlayerModal/PlayerModal'
import { phaseLabel, getPredBreakdown } from '@/utils/format'
import s from './GlobalPalpitesTab.module.css'

// ── helpers ───────────────────────────────────────────────────────────────────

function shortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'short',
  })
}

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

function normalize(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function matchesSearch(m: PalpitableMatch, q: string) {
  const nq = normalize(q.trim())
  return normalize(m.homeTeam).includes(nq) || normalize(m.awayTeam).includes(nq)
}

function isMatchFinished(m: PalpitableMatch) {
  return m.status === 'finished'
}

// ── category config (post-result) ─────────────────────────────────────────────

const CAT_CONFIG: Record<GlobalPalpiteCategory | 'sem_palpite', { label: string; pts: string; css: string }> = {
  cravou:           { label: 'Cravou!',            pts: '10–17 pts', css: 'cravou'    },
  resultado_bonus:  { label: 'Resultado + Bônus',   pts: '7–11 pts',  css: 'bonus'     },
  resultado_certo:  { label: 'Resultado Certo',     pts: '5–9 pts',   css: 'resultado' },
  parcial:          { label: 'Gols de um time',     pts: '2 pts',     css: 'parcial'   },
  errou:            { label: 'Errou tudo',           pts: '0 pts',     css: 'errou'     },
  sem_palpite:      { label: 'Não palpitaram',       pts: '—',         css: 'sempal'    },
}

const CAT_ORDER: (GlobalPalpiteCategory | 'sem_palpite')[] = [
  'cravou', 'resultado_bonus', 'resultado_certo', 'parcial', 'errou', 'sem_palpite',
]

// ── pre-result outcome config ─────────────────────────────────────────────────

type PreResultGroup = 'home_win' | 'away_win' | 'draw' | 'sem_palpite'

function getPreResultGroup(p: PalpitableGlobalPalpite): PreResultGroup {
  if (p.homeScore === null || p.awayScore === null) return 'sem_palpite'
  if (p.homeScore > p.awayScore) return 'home_win'
  if (p.awayScore > p.homeScore) return 'away_win'
  return 'draw'
}

// ── sub-components ────────────────────────────────────────────────────────────

function MemberCardFinished({
  p,
  phase,
  onCardClick,
}: {
  p: PalpitableGlobalPalpite
  phase: string
  onCardClick?: () => void
}) {
  const cat = (p.category ?? 'errou') as GlobalPalpiteCategory | 'sem_palpite'
  const cfg = CAT_CONFIG[cat]
  const bd = p.points !== null ? getPredBreakdown(p.points, phase) : null
  const hasBonus = bd && bd.bonus > 0

  return (
    <div
      className={`${s.card} ${s[`card_${cfg.css}`]}`}
      onClick={cat !== 'sem_palpite' ? onCardClick : undefined}
      style={cat === 'sem_palpite' ? { cursor: 'default' } : undefined}
    >
      <div className={s.cardAvatar} style={{ background: avatarColor(p.userId) }}>
        {avatarInitial(p.name)}
      </div>
      <span className={s.cardName}>{p.name}</span>
      <div className={s.cardRight}>
        <span className={s.cardScore}>
          {p.homeScore !== null && p.awayScore !== null ? `${p.homeScore}×${p.awayScore}` : '—'}
        </span>
        {hasBonus && p.points !== null ? (
          <div className={s.cardBonusRow}>
            <span className={`${s.cardBadge} ${s[`badge_${cfg.css}`]}`}>{`+${bd!.base}`}</span>
            <span className={bd!.modifier < 0 ? s.penaltyPill : s.bonusPill}>
              {bd!.drawBonus && <Minus size={7} strokeWidth={3} />}
              {bd!.modifier < 0 ? String(bd!.modifier) : `+${bd!.bonus}`}
            </span>
          </div>
        ) : (
          <span className={`${s.cardBadge} ${s[`badge_${cfg.css}`]}`}>
            {p.points !== null ? `+${p.points}` : '—'}
          </span>
        )}
      </div>
    </div>
  )
}

function MemberCardPreResult({
  p,
  groupCss,
}: {
  p: PalpitableGlobalPalpite
  groupCss: string
}) {
  const isSemPalpite = p.homeScore === null

  return (
    <div className={`${s.card} ${s[`card_${groupCss}`]}`} style={{ cursor: 'default' }}>
      <div className={s.cardAvatar} style={{ background: avatarColor(p.userId) }}>
        {avatarInitial(p.name)}
      </div>
      <span className={s.cardName}>{p.name}</span>
      <div className={s.cardRight}>
        {isSemPalpite ? (
          <span className={s.cardScore}>—</span>
        ) : (
          <>
            <span className={s.cardScore}>{p.homeScore}×{p.awayScore}</span>
            {p.penaltyWinner && (
              <span className={s.cardPenLabel}>{p.penaltyWinner}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Post-result view (partida finalizada) ─────────────────────────────────────

function PalpitesFinishedView({
  data,
  onCardClick,
}: {
  data: PalpitableMatchPalpites
  onCardClick: (p: PalpitableGlobalPalpite) => void
}) {
  const groups = CAT_ORDER.map((cat) => ({
    cat,
    cfg: CAT_CONFIG[cat],
    items: data.palpites.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0)

  const total = data.palpites.length

  return (
    <div className={s.palpitesView}>
      <div className={s.summaryStrip}>
        {CAT_ORDER.map((cat) => {
          const n = data.palpites.filter((p) => p.category === cat).length
          if (n === 0) return null
          const css = CAT_CONFIG[cat].css
          return (
            <div key={cat} className={`${s.stripChip} ${s[`chip_${css}`]}`}>
              <span className={s.stripNum}>{n}</span>
              <span className={s.stripLabel}>/{total}</span>
            </div>
          )
        })}
      </div>

      {groups.map(({ cat, cfg, items }) => {
        const hasDrawBonus = cat === 'resultado_certo' && items.some(
          p => p.points !== null && getPredBreakdown(p.points, data.match.phase)?.drawBonus
        )
        return (
          <div key={cat} className={s.catSection}>
            <div className={`${s.catHeader} ${s[`catHeader_${cfg.css}`]}`}>
              <span className={s.catTitle}>
                {cfg.label}
                {hasDrawBonus && <Minus size={10} strokeWidth={2.5} className={s.catTitleDrawIcon} />}
              </span>
              <span className={s.catPts}>{cfg.pts}</span>
              <span className={s.catCount}>{items.length}</span>
            </div>
            <div className={s.cardGrid}>
              {items.map((p) => (
                <MemberCardFinished
                  key={p.userId}
                  p={p}
                  phase={data.match.phase}
                  onCardClick={p.category !== 'sem_palpite' ? () => onCardClick(p) : undefined}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Pre-result view (partida bloqueada mas não finalizada) ────────────────────

const PRE_RESULT_CONFIG: Record<PreResultGroup, { label: (home: string, away: string) => string; css: string }> = {
  home_win:    { label: (home) => `Vence ${home}`,    css: 'homeWin'   },
  away_win:    { label: (_, away) => `Vence ${away}`, css: 'awayWin'   },
  draw:        { label: () => 'Empate',               css: 'draw'      },
  sem_palpite: { label: () => 'Não palpitaram',       css: 'sempal'    },
}

const PRE_RESULT_ORDER: PreResultGroup[] = ['home_win', 'away_win', 'draw', 'sem_palpite']

function PalpitesPreResultView({ data }: { data: PalpitableMatchPalpites }) {
  const { homeTeam, awayTeam } = data.match
  const total = data.palpites.length

  const groups = PRE_RESULT_ORDER.map((grp) => ({
    grp,
    cfg: PRE_RESULT_CONFIG[grp],
    items: data.palpites.filter((p) => getPreResultGroup(p) === grp),
  })).filter((g) => g.items.length > 0)

  return (
    <div className={s.palpitesView}>
      <div className={s.preResultNote}>
        <Lock size={11} />
        Palpites revelados após o bloqueio · resultado ainda não definido
      </div>

      <div className={s.summaryStrip}>
        {PRE_RESULT_ORDER.map((grp) => {
          const n = data.palpites.filter((p) => getPreResultGroup(p) === grp).length
          if (n === 0) return null
          const css = PRE_RESULT_CONFIG[grp].css
          return (
            <div key={grp} className={`${s.stripChip} ${s[`chip_${css}`]}`}>
              <span className={s.stripNum}>{n}</span>
              <span className={s.stripLabel}>/{total}</span>
            </div>
          )
        })}
      </div>

      {groups.map(({ grp, cfg, items }) => (
        <div key={grp} className={s.catSection}>
          <div className={`${s.catHeader} ${s[`catHeader_${cfg.css}`]}`}>
            <span className={s.catTitle}>{cfg.label(homeTeam, awayTeam)}</span>
            <span className={s.catCount}>{items.length}</span>
          </div>
          <div className={s.cardGrid}>
            {items.map((p) => (
              <MemberCardPreResult key={p.userId} p={p} groupCss={cfg.css} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── module-level cache (survives tab switches) ────────────────────────────────

let _cachedMatches: PalpitableMatch[] | null = null
const _palpitesCache: Record<string, PalpitableMatchPalpites> = {}

// ── main component ────────────────────────────────────────────────────────────

export default function GlobalPalpitesTab() {
  const [matches, setMatches]                 = useState<PalpitableMatch[]>(_cachedMatches ?? [])
  const [selectedId, setSelectedId]           = useState<string | null>(null)
  const [palpites, setPalpites]               = useState<PalpitableMatchPalpites | null>(null)
  const [loadingMatches, setLoadingMatches]   = useState(_cachedMatches === null)
  const [loadingPalpites, setLoadingPalpites] = useState(false)
  const [search, setSearch]                   = useState('')
  const [selectedPlayer, setSelectedPlayer]   = useState<PalpitableGlobalPalpite | null>(null)

  const selectMatch = useCallback(async (matchId: string) => {
    setSelectedId(matchId)
    if (_palpitesCache[matchId]) {
      setPalpites(_palpitesCache[matchId])
      return
    }
    setLoadingPalpites(true)
    setPalpites(null)
    try {
      const data = await getGlobalMatchPalpitesLive(matchId)
      _palpitesCache[matchId] = data
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
        const res = await getGlobalPalpitavelMatches()
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
  const finished = selectedMatch ? isMatchFinished(selectedMatch) : false

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
        <span>Os palpites ficam visíveis assim que a partida bloquear.</span>
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
              const fin = isMatchFinished(m)
              const isLive = m.status === 'live'
              return (
                <button
                  key={m.id}
                  className={`${s.chip} ${m.id === selectedId ? s.chipActive : ''}`}
                  onClick={() => selectMatch(m.id)}
                >
                  {m.id === latestMatchId && <span className={s.latestDot} />}
                  <CountryBadge country={m.homeTeam} size="xs" />
                  {fin ? (
                    <span className={s.chipScore}>{m.homeScore}×{m.awayScore}</span>
                  ) : isLive ? (
                    <span className={s.chipLive}><Radio size={9} />AO VIVO</span>
                  ) : (
                    <span className={s.chipLock}><Lock size={9} /></span>
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
            <span className={s.matchBarScore}>
              {finished
                ? `${selectedMatch.homeScore} × ${selectedMatch.awayScore}`
                : selectedMatch.status === 'live'
                  ? <span className={s.matchBarLiveBadge}><Radio size={11} />AO VIVO</span>
                  : <Lock size={16} />}
            </span>
            <CountryBadge country={selectedMatch.awayTeam} size="sm" />
          </div>
          <div className={s.matchBarMeta}>
            <div className={s.matchBarNameRow}>
              <span className={s.matchBarTeamNames}>
                {selectedMatch.homeTeam} · {selectedMatch.awayTeam}
              </span>
              {isLatest && <span className={s.latestBadge}>
                {finished ? 'Último jogo' : selectedMatch.status === 'live' ? 'Ao vivo' : 'Bloqueado'}
              </span>}
            </div>
            <span className={s.matchBarInfo}>
              {phaseLabel(selectedMatch.phase)} · {shortDate(selectedMatch.matchDate)}
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
        finished
          ? <PalpitesFinishedView data={palpites} onCardClick={setSelectedPlayer} />
          : <PalpitesPreResultView data={palpites} />
      ) : null}

      {selectedPlayer && selectedMatch && finished && (
        <PlayerModal
          player={selectedPlayer as any}
          match={selectedMatch as any}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  )
}
