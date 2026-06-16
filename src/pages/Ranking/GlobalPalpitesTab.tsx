import { useEffect, useState, useCallback } from 'react'
import { Target, Search, X } from 'lucide-react'
import {
  getGlobalFinishedMatches,
  getGlobalMatchPalpites,
  type GlobalFinishedMatch,
  type GlobalMatchPalpites,
  type GlobalPalpiteCategory,
  type GlobalPalpite,
} from '@/services/cravouService'
import { CountryBadge } from '@/components/CountryBadge'
import { phaseLabel } from '@/utils/format'
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

function matchesSearch(m: GlobalFinishedMatch, q: string) {
  const nq = normalize(q.trim())
  return normalize(m.homeTeam).includes(nq) || normalize(m.awayTeam).includes(nq)
}

// ── category config ───────────────────────────────────────────────────────────

const CAT_CONFIG: Record<GlobalPalpiteCategory, { label: string; pts: string; css: string }> = {
  cravou:           { label: 'Cravou!',            pts: '10–15 pts', css: 'cravou'    },
  resultado_bonus:  { label: 'Resultado + Bônus',   pts: '7–10 pts',  css: 'bonus'     },
  resultado_certo:  { label: 'Resultado Certo',     pts: '5–8 pts',   css: 'resultado' },
  parcial:          { label: 'Gols de um time',     pts: '2 pts',     css: 'parcial'   },
  errou:            { label: 'Errou tudo',           pts: '0 pts',     css: 'errou'     },
}

const CAT_ORDER: GlobalPalpiteCategory[] = ['cravou', 'resultado_bonus', 'resultado_certo', 'parcial', 'errou']

// ── sub-components ────────────────────────────────────────────────────────────

function MemberCard({ p }: { p: GlobalPalpite }) {
  const css = CAT_CONFIG[p.category].css
  const isBonus = p.category === 'resultado_bonus'
  const basePoints = isBonus && p.points !== null ? p.points - 2 : null

  return (
    <div className={`${s.card} ${s[`card_${css}`]}`}>
      <div className={s.cardAvatar} style={{ background: avatarColor(p.userId) }}>
        {avatarInitial(p.name)}
      </div>
      <span className={s.cardName}>{p.name}</span>
      <div className={s.cardRight}>
        <span className={s.cardScore}>
          {p.homeScore !== null && p.awayScore !== null ? `${p.homeScore}×${p.awayScore}` : '—'}
        </span>
        {isBonus && p.points !== null ? (
          <div className={s.cardBonusRow}>
            <span className={`${s.cardBadge} ${s[`badge_${css}`]}`}>{`+${basePoints}`}</span>
            <span className={s.bonusPill}>+2★</span>
          </div>
        ) : (
          <span className={`${s.cardBadge} ${s[`badge_${css}`]}`}>
            {p.points !== null ? `+${p.points}` : '—'}
          </span>
        )}
      </div>
    </div>
  )
}

function PalpitesView({ data }: { data: GlobalMatchPalpites }) {
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

      {groups.map(({ cat, cfg, items }) => (
        <div key={cat} className={s.catSection}>
          <div className={`${s.catHeader} ${s[`catHeader_${cfg.css}`]}`}>
            <span className={s.catTitle}>{cfg.label}</span>
            <span className={s.catPts}>{cfg.pts}</span>
            <span className={s.catCount}>{items.length}</span>
          </div>
          <div className={s.cardGrid}>
            {items.map((p) => <MemberCard key={p.userId} p={p} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── module-level cache (survives tab switches) ────────────────────────────────

let _cachedMatches: GlobalFinishedMatch[] | null = null
const _palpitesCache: Record<string, GlobalMatchPalpites> = {}

// ── main component ────────────────────────────────────────────────────────────

export default function GlobalPalpitesTab() {
  const [matches, setMatches]                 = useState<GlobalFinishedMatch[]>(_cachedMatches ?? [])
  const [selectedId, setSelectedId]           = useState<string | null>(null)
  const [palpites, setPalpites]               = useState<GlobalMatchPalpites | null>(null)
  const [loadingMatches, setLoadingMatches]   = useState(_cachedMatches === null)
  const [loadingPalpites, setLoadingPalpites] = useState(false)
  const [search, setSearch]                   = useState('')

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
        <p>Nenhum jogo finalizado ainda.</p>
        <span>Os palpites aparecem assim que os jogos forem encerrados.</span>
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
            {filtered.map((m) => (
              <button
                key={m.id}
                className={`${s.chip} ${m.id === selectedId ? s.chipActive : ''}`}
                onClick={() => selectMatch(m.id)}
              >
                {m.id === latestMatchId && <span className={s.latestDot} />}
                <CountryBadge country={m.homeTeam} size="xs" />
                <span className={s.chipScore}>{m.homeScore}×{m.awayScore}</span>
                <CountryBadge country={m.awayTeam} size="xs" />
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedMatch && (
        <div className={s.matchBar}>
          <div className={s.matchBarTeams}>
            <CountryBadge country={selectedMatch.homeTeam} size="sm" />
            <span className={s.matchBarScore}>
              {selectedMatch.homeScore} × {selectedMatch.awayScore}
            </span>
            <CountryBadge country={selectedMatch.awayTeam} size="sm" />
          </div>
          <div className={s.matchBarMeta}>
            <div className={s.matchBarNameRow}>
              <span className={s.matchBarTeamNames}>
                {selectedMatch.homeTeam} · {selectedMatch.awayTeam}
              </span>
              {isLatest && <span className={s.latestBadge}>Último jogo</span>}
            </div>
            <span className={s.matchBarInfo}>
              {phaseLabel(selectedMatch.phase)} · {shortDate(selectedMatch.matchDate)}
              {selectedMatch.penaltyWinner && (
                <> · <span className={s.matchBarPen}>Pen: {selectedMatch.penaltyWinner}</span></>
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
        <PalpitesView data={palpites} />
      ) : null}
    </>
  )
}
