import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Target } from 'lucide-react'
import {
  getGroupFinishedMatches,
  getGroupMatchPalpites,
  type GroupFinishedMatch,
  type MemberPalpite,
  type GroupMatchPalpites,
  type PalpiteCategory,
} from '@/services/bolaoService'
import { CountryBadge } from '@/components/CountryBadge'
import { phaseLabel } from '@/utils/format'
import s from './BolaoGrupoPalpites.module.css'

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

// ── category config ───────────────────────────────────────────────────────────

const CAT_CONFIG: Record<PalpiteCategory, { label: string; pts: string; css: string }> = {
  cravou:          { label: 'Cravou!',          pts: '10–15 pts', css: 'cravou' },
  resultado_certo: { label: 'Resultado Certo',  pts: '5–8 pts',   css: 'resultado' },
  parcial:         { label: 'Gols de um time',  pts: '2 pts',     css: 'parcial' },
  errou:           { label: 'Errou tudo',        pts: '0 pts',     css: 'errou' },
  sem_palpite:     { label: 'Sem palpite',       pts: '—',         css: 'sempal' },
}

const CAT_ORDER: PalpiteCategory[] = ['cravou', 'resultado_certo', 'parcial', 'errou', 'sem_palpite']

// ── sub-components ────────────────────────────────────────────────────────────

function MemberCard({ p }: { p: MemberPalpite }) {
  const css = CAT_CONFIG[p.category].css
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
        <span className={`${s.cardBadge} ${s[`badge_${css}`]}`}>
          {p.points !== null ? `+${p.points}` : '—'}
        </span>
      </div>
    </div>
  )
}

interface PalpitesViewProps {
  data: GroupMatchPalpites
}

function PalpitesView({ data }: PalpitesViewProps) {
  const groups = CAT_ORDER.map((cat) => ({
    cat,
    cfg: CAT_CONFIG[cat],
    items: data.palpites.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0)

  const total = data.palpites.length

  return (
    <div className={s.palpitesView}>
      {/* summary strip */}
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

      {/* groups */}
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

// ── main page ─────────────────────────────────────────────────────────────────

export default function BolaoGrupoPalpites() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const chipListRef = useRef<HTMLDivElement>(null)

  const [matches, setMatches]               = useState<GroupFinishedMatch[]>([])
  const [selectedId, setSelectedId]         = useState<string | null>(null)
  const [palpites, setPalpites]             = useState<GroupMatchPalpites | null>(null)
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [loadingPalpites, setLoadingPalpites] = useState(false)
  const [groupName, setGroupName]           = useState('')
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

  const selectedMatch = matches.find((m) => m.id === selectedId)

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
            <p>Nenhum jogo finalizado ainda.</p>
            <span>Os palpites aparecem assim que os jogos forem encerrados.</span>
          </div>
        ) : (
          <>
            {/* Match selector chips */}
            <div className={s.chipWrapper}>
              <div className={s.chipScroll} ref={chipListRef}>
                {matches.map((m) => (
                  <button
                    key={m.id}
                    className={`${s.chip} ${m.id === selectedId ? s.chipActive : ''}`}
                    onClick={() => selectMatch(m.id)}
                  >
                    <CountryBadge country={m.homeTeam} size="xs" />
                    <span className={s.chipScore}>{m.homeScore}×{m.awayScore}</span>
                    <CountryBadge country={m.awayTeam} size="xs" />
                  </button>
                ))}
              </div>
            </div>

            {/* Selected match info bar */}
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
                  <span className={s.matchBarTeamNames}>
                    {selectedMatch.homeTeam} &nbsp;·&nbsp; {selectedMatch.awayTeam}
                  </span>
                  <span className={s.matchBarInfo}>
                    {phaseLabel(selectedMatch.phase)} · {shortDate(selectedMatch.matchDate)}
                    {selectedMatch.penaltyWinner && (
                      <> · <span className={s.matchBarPen}>Pen: {selectedMatch.penaltyWinner}</span></>
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
              <PalpitesView data={palpites} />
            ) : null}
          </>
        )}

      </div>
    </div>
  )
}
