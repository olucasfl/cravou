import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  HelpCircle, X, Lock, Clock, Target, CheckCircle2, XCircle, Trophy,
  Calendar, Flag, Timer, ChevronRight, Crown,
} from 'lucide-react'
import { getMe, type User } from '@/services/authService'
import {
  getMatches, getMyPredictions, getRanking, getAllGroups, getBracket,
  type Match, type Prediction, type GroupData, type Standing, type BracketSlot,
} from '@/services/cravouService'
import { formatMatchDate, getPredCategory } from '@/utils/format'
import { clearCache } from '@/utils/cache'
import { CountryBadge } from '@/components/CountryBadge'
import { SoccerBall } from '@/components/icons/SoccerBall'
import { useSocketEvent } from '@/hooks/useSocketEvent'
import s from './Home.module.css'

type MainTab = 'jogos' | 'copa'
type CopaTab = 'grupos' | 'mata'

const BRACKET_ROUNDS = [
  { value: 'round_of_32',  label: '16 avos'  },
  { value: 'round_of_16',  label: 'Oitavas'  },
  { value: 'quarterfinal', label: 'Quartas'  },
  { value: 'semifinal',    label: 'Semi'     },
  { value: 'third_place',  label: '3º Lugar' },
  { value: 'final',        label: 'Final'    },
]

const ROUND_SLOT_COUNTS: Record<string, number> = {
  round_of_32: 16, round_of_16: 8, quarterfinal: 4, semifinal: 2, third_place: 1, final: 1,
}

export default function Home() {
  const [user, setUser]               = useState<User | null>(null)
  const [allMatches, setAllMatches]   = useState<Match[]>([])
  const [myPredictions, setMyPredictions] = useState<Prediction[]>([])
  const [myPosition, setMyPosition]   = useState<number | null>(null)
  const [groups, setGroups]           = useState<GroupData[]>([])
  const [bracket, setBracket]         = useState<BracketSlot[]>([])
  const [loading, setLoading]         = useState(true)
  const [showTutorial, setShowTutorial]     = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const [mainTab, setMainTab]         = useState<MainTab>('jogos')
  const [copaTab, setCopaTab]         = useState<CopaTab>('grupos')
  const [bracketRound, setBracketRound] = useState('round_of_32')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [u, all, preds, ranking, g, b] = await Promise.all([
      getMe().catch(() => null),
      getMatches().catch(() => []),
      getMyPredictions().catch(() => []),
      getRanking().catch(() => []),
      getAllGroups().catch(() => []),
      getBracket().catch(() => []),
    ])
    setUser(u)
    setAllMatches(all)
    setMyPredictions(preds)
    setGroups(g as GroupData[])
    setBracket(b as BracketSlot[])
    if (u) setMyPosition(ranking.find(r => r.userId === u.id)?.position ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const [u, all, preds, ranking, g, b] = await Promise.all([
        getMe().catch(() => null),
        getMatches().catch(() => []),
        getMyPredictions().catch(() => []),
        getRanking().catch(() => []),
        getAllGroups().catch(() => []),
        getBracket().catch(() => []),
      ])
      setUser(u)
      setAllMatches(all)
      setMyPredictions(preds)
      setGroups(g as GroupData[])
      setBracket(b as BracketSlot[])
      if (u) setMyPosition(ranking.find(r => r.userId === u.id)?.position ?? null)
      setLoading(false)
    }
    init()
  }, [])

  useSocketEvent('match:updated',               useCallback(() => { clearCache('matches','ranking','predictions'); load() }, [load]))
  useSocketEvent('match:locked',                useCallback(() => { clearCache('matches'); load() }, [load]))
  useSocketEvent('group:classified',            useCallback(() => { clearCache('groups','bracket'); load() }, [load]))
  useSocketEvent('tournament:all-groups-complete', useCallback(() => { clearCache('groups','bracket'); load() }, [load]))

  // ── Computed ───────────────────────────────────────────────

  const predMap  = useMemo(() => new Map(myPredictions.map(p => [p.matchId, p])), [myPredictions])
  const matchMap = useMemo(() => new Map(allMatches.map(m => [m.id, m])), [allMatches])

  const live = useMemo(() => allMatches.filter(m => m.status === 'live'), [allMatches])

  const upcoming = useMemo(() =>
    allMatches
      .filter(m => m.status === 'upcoming')
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()),
    [allMatches])

  const finished = useMemo(() =>
    allMatches
      .filter(m => m.status === 'finished')
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()),
    [allMatches])

  const scoredPredictions = useMemo(() =>
    myPredictions
      .filter(p => p.points !== null && p.points > 0)
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      .map(p => ({ ...p, match: matchMap.get(p.matchId) }))
      .filter(p => p.match != null) as (Prediction & { match: Match })[],
    [myPredictions, matchMap])

  const groupRows = useMemo(() => {
    const sorted = [...groups].sort((a, b) => a.group.localeCompare(b.group))
    const rows: GroupData[][] = []
    for (let i = 0; i < sorted.length; i += 2) rows.push(sorted.slice(i, i + 2))
    return rows
  }, [groups])

  const bracketByRound = useMemo(() => {
    const map: Record<string, BracketSlot[]> = {}
    for (const slot of bracket) {
      if (!map[slot.round]) map[slot.round] = []
      map[slot.round].push(slot)
    }
    for (const r in map) map[r].sort((a, b) => a.slotNumber - b.slotNumber)
    return map
  }, [bracket])

  const currentRoundSlots = useMemo((): BracketSlot[] => {
    if ((bracketByRound[bracketRound]?.length ?? 0) > 0) return bracketByRound[bracketRound]
    const count = ROUND_SLOT_COUNTS[bracketRound] ?? 1
    return Array.from({ length: count }, (_, i) => ({
      id: `ph-${bracketRound}-${i + 1}`,
      round: bracketRound, slotNumber: i + 1,
      homeDesc: 'A definir', awayDesc: 'A definir',
      homeTeam: null, awayTeam: null, winnerTeam: null, matchId: null,
    }))
  }, [bracketByRound, bracketRound])

  const finishedCount = allMatches.filter(m => m.status === 'finished').length
  const totalMatches  = allMatches.length
  const progressPct   = totalMatches > 0 ? Math.round((finishedCount / totalMatches) * 100) : 0
  const initials      = user?.name?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <div className="app-layout">
      <div className="page fade-up">

        {/* Brand */}
        <div className={s.brand}>
          <img src="/logo-text.png" className={s.brandLogo} alt="Cravou!" />
        </div>

        {/* Header */}
        <div className={s.header}>
          <div>
            <div className={s.greeting}>Olá,</div>
            <div className={s.name}>{user?.name ?? '...'}</div>
          </div>
          <div className={s.headerRight}>
            <button className={s.howBtn} onClick={() => setShowTutorial(true)}>
              <HelpCircle size={14} /> Como funciona?
            </button>
            <div className={s.avatar}>{initials}</div>
          </div>
        </div>

        {/* Score Card */}
        <div className={s.scoreCard}>
          <div className={s.scoreCardTop}>
            <span className={s.scoreLabel}>Seus pontos</span>
            {!loading && myPosition && (
              <span className={s.rankBadge}><Crown size={11} />#{myPosition} no ranking</span>
            )}
          </div>
          <div className={s.scoreRow}>
            <div className={s.scoreLeft}>
              {loading
                ? <div className="skeleton" style={{ width: 90, height: 44, borderRadius: 10, marginBottom: 4 }} />
                : <div className={s.scoreValue}>{user?.bolaoPoints ?? 0}</div>
              }
              <div className={s.scoreSub}>no bolão</div>
            </div>
            <div className={s.scoreIcon}>
              <img src="/logo-ball.png" className={s.scoreIconImg} alt="" />
            </div>
          </div>
          <div className={s.cravasRow}>
            <Target size={13} className={s.cravasIcon} />
            {loading
              ? <div className="skeleton" style={{ width: 32, height: 16, borderRadius: 99, display: 'inline-block' }} />
              : <span className={s.cravasValue}>{user?.cravadas ?? 0}</span>
            }
            <span className={s.cravasLabel}>cravadas</span>
          </div>
          {!loading && scoredPredictions.length > 0 && (
            <button className={s.historyToggle} onClick={() => setShowHistoryModal(true)}>
              <Target size={11} />
              Ver onde ganhei pontos ({scoredPredictions.length})
              <ChevronRight size={12} />
            </button>
          )}
        </div>

        {/* Progress */}
        {!loading && totalMatches > 0 && (
          <div className={s.progress}>
            <div className={s.progressHeader}>
              <span className={s.progressLabel}>Copa do Mundo 2026</span>
              <span className={s.progressCount}>{finishedCount} / {totalMatches} jogos</span>
            </div>
            <div className={s.progressBar}>
              <div className={s.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        {/* Live */}
        {live.length > 0 && (
          <div className={s.section}>
            <div className={s.sectionHeader}>
              <span className={s.sectionTitle}>Ao vivo agora</span>
              <span className={s.live}><span className={s.liveDot} /> Live</span>
            </div>
            {live.map(m => <MatchCard key={m.id} match={m} pred={predMap.get(m.id)} />)}
          </div>
        )}

        {/* ── Main Tabs ───────────────────────────────────────── */}
        <div className={s.mainTabs}>
          <button
            className={`${s.mainTab} ${mainTab === 'jogos' ? s.mainTabActive : ''}`}
            onClick={() => setMainTab('jogos')}
          >
            Jogos
          </button>
          <button
            className={`${s.mainTab} ${mainTab === 'copa' ? s.mainTabActive : ''}`}
            onClick={() => setMainTab('copa')}
          >
            Copa
          </button>
        </div>

        {/* ══ ABA: JOGOS ══════════════════════════════════════════ */}
        {mainTab === 'jogos' && (
          <div>
            {loading && [1, 2, 3].map(i => (
              <div key={i} className={s.matchCardSkeleton}>
                <div className="skeleton" style={{ width: 70, height: 10, borderRadius: 99, marginBottom: 10 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                  <div className="skeleton" style={{ flex: 1, height: 13, borderRadius: 99 }} />
                  <div className="skeleton" style={{ width: 44, height: 22, borderRadius: 8, flexShrink: 0 }} />
                  <div className="skeleton" style={{ flex: 1, height: 13, borderRadius: 99 }} />
                  <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                </div>
              </div>
            ))}

            {!loading && upcoming.length === 0 && (
              <div className={s.empty}><div className={s.emptyIcon}><SoccerBall size={36} /></div>Nenhum jogo agendado</div>
            )}

            {!loading && upcoming.slice(0, 6).map(m => (
              <MatchCard key={m.id} match={m} pred={predMap.get(m.id)} />
            ))}

            {!loading && upcoming.length > 0 && (
              <Link to="/matches" className={s.verMaisBtn}>
                Ver todos os jogos <ChevronRight size={15} />
              </Link>
            )}
          </div>
        )}

        {/* ══ ABA: COPA ═══════════════════════════════════════════ */}
        {mainTab === 'copa' && (
          <div>
            <div className={s.subTabs}>
              <button className={`${s.subTab} ${copaTab === 'grupos' ? s.subTabActive : ''}`} onClick={() => setCopaTab('grupos')}>
                Grupos
              </button>
              <button className={`${s.subTab} ${copaTab === 'mata' ? s.subTabActive : ''}`} onClick={() => setCopaTab('mata')}>
                Mata-mata
              </button>
            </div>

            {/* Grupos */}
            {copaTab === 'grupos' && (
              loading
                ? <div className={s.groupCardRow}>{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 148, borderRadius: 12 }} />)}</div>
                : groups.length === 0
                  ? <div className={s.empty}><div className={s.emptyIcon}><Trophy size={36} /></div>Grupos ainda não disponíveis</div>
                  : <div className={s.groupRows}>
                      {groupRows.map(row => {
                        const active = row.find(g => g.group === selectedGroup)
                        return (
                          <div key={row[0].group} className={s.groupRowWrapper}>
                            <div className={s.groupCardRow}>
                              {row.map(g => (
                                <GroupCard
                                  key={g.group}
                                  group={g}
                                  selected={selectedGroup === g.group}
                                  onToggle={() => setSelectedGroup(selectedGroup === g.group ? null : g.group)}
                                />
                              ))}
                            </div>
                            {active && (
                              <div className={s.accordionPanel}>
                                <StandingsTable group={active.group} standings={active.standings} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
            )}

            {/* Mata-mata */}
            {copaTab === 'mata' && (
              <div>
                <div className={s.roundTabs}>
                  {BRACKET_ROUNDS.map(r => (
                    <button
                      key={r.value}
                      className={`${s.roundTab} ${bracketRound === r.value ? s.roundTabActive : ''} ${r.value === 'final' ? s.roundTabFinal : ''}`}
                      onClick={() => setBracketRound(r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {loading
                  ? <div className={s.bracketGrid}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}</div>
                  : <div className={s.bracketGrid}>
                      {currentRoundSlots.map(slot => <BracketCard key={slot.id} slot={slot} />)}
                    </div>
                }
              </div>
            )}
          </div>
        )}

      </div>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      {showHistoryModal && <HistoryModal predictions={scoredPredictions} onClose={() => setShowHistoryModal(false)} />}
    </div>
  )
}

// ── MatchCard ─────────────────────────────────────────────────────────────────

function MatchCard({ match: m, pred }: { match: Match; pred?: Prediction }) {
  return (
    <Link to={`/matches/${m.id}`} className={s.matchCard}>
      <div className={s.matchMeta}>
        <span className={s.matchGroup}>
          {m.groupName ? `Grupo ${m.groupName}` : m.phase.replace(/_/g, ' ')}
        </span>
        <span className={s.matchDate}>{formatMatchDate(m.matchDate)}</span>
      </div>
      <div className={s.matchTeams}>
        <div className={s.team}>
          <CountryBadge country={m.homeTeam} size="sm" />
          <div className={s.teamName}>{m.homeTeam}</div>
        </div>
        <div className={s.score}>
          {m.status === 'finished' || m.status === 'live' ? (
            <>
              <span className={s.scoreNum}>{m.homeScore ?? 0}</span>
              <span className={s.scoreSep}>-</span>
              <span className={s.scoreNum}>{m.awayScore ?? 0}</span>
            </>
          ) : (
            <span className={s.vs}>VS</span>
          )}
        </div>
        <div className={s.team}>
          <CountryBadge country={m.awayTeam} size="sm" />
          <div className={s.teamName}>{m.awayTeam}</div>
        </div>
      </div>
      {pred && (
        <div className={s.matchPrediction}>
          <span className={s.predLabel}>Seu palpite</span>
          <span className={s.predValue}>{pred.homeScore} × {pred.awayScore}{pred.points !== null ? ` · +${pred.points}pts` : ''}</span>
        </div>
      )}
    </Link>
  )
}

// ── GroupCard ─────────────────────────────────────────────────────────────────

function GroupCard({ group, selected, onToggle }: { group: GroupData; selected: boolean; onToggle: () => void }) {
  const sorted = useMemo(() =>
    [...group.standings].sort((a, b) => {
      if (a.position && b.position) return a.position - b.position
      return b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
    }), [group.standings])

  return (
    <div className={`${s.groupCard} ${selected ? s.groupCardActive : ''}`} onClick={onToggle}>
      <div className={s.groupLetter}>Grupo {group.group}</div>
      <div className={s.groupTeamsList}>
        {sorted.slice(0, 4).map(st => (
          <div key={st.teamName} className={`${s.groupTeamRow} ${st.isQualified ? s.qualified : ''}`}>
            <CountryBadge country={st.teamName} size="xs" />
            <span>{st.teamName}</span>
          </div>
        ))}
      </div>
      <div className={s.expandHint}>{selected ? '▲' : '▼'}</div>
    </div>
  )
}

// ── StandingsTable ────────────────────────────────────────────────────────────

function StandingsTable({ group, standings }: { group: string; standings: Standing[] }) {
  const sorted = [...standings].sort((a, b) => {
    if (a.position && b.position) return a.position - b.position
    if (a.points !== b.points) return b.points - a.points
    return b.goalDifference - a.goalDifference
  })
  return (
    <div className={s.detail}>
      <div className={s.detailHeader}>
        <span className={s.detailTitle}>GRUPO {group}</span>
        <span className="badge badge-muted">{standings.length} seleções</span>
      </div>
      <table className={s.table}>
        <thead>
          <tr>
            <th className={s.th} style={{ textAlign: 'left' }}>Seleção</th>
            <th className={s.th}>J</th>
            <th className={s.th}>V</th>
            <th className={s.th}>E</th>
            <th className={s.th}>D</th>
            <th className={s.th}>SG</th>
            <th className={s.th}>PTS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((st, idx) => (
            <tr key={st.teamName} className={`${s.tr} ${st.isQualified ? s.qualifiedRow : ''}`}>
              <td className={s.td}>
                <div className={s.tdTeam}>
                  <span className={`${s.pos} ${idx < 2 ? s.top : ''}`}>{st.position ?? idx + 1}</span>
                  <CountryBadge country={st.teamName} size="xs" />
                  <span>{st.teamName}</span>
                </div>
              </td>
              <td className={s.td}>{st.matchesPlayed}</td>
              <td className={s.td}>{st.wins}</td>
              <td className={s.td}>{st.draws}</td>
              <td className={s.td}>{st.losses}</td>
              <td className={s.td}>{st.goalDifference > 0 ? `+${st.goalDifference}` : st.goalDifference}</td>
              <td className={s.td}><span className={s.pts}>{st.points}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── BracketCard ───────────────────────────────────────────────────────────────

function BracketCard({ slot }: { slot: BracketSlot }) {
  const hasTeams = slot.homeTeam || slot.awayTeam
  return (
    <div className={`${s.bracketCard} ${slot.winnerTeam ? s.bracketCardDone : ''}`}>
      <span className={s.bracketNum}>#{slot.slotNumber}</span>
      <div className={s.bracketTeams}>
        <div className={`${s.bracketTeamRow} ${slot.winnerTeam === slot.homeTeam && slot.winnerTeam ? s.bracketWinner : ''}`}>
          {slot.homeTeam
            ? <><CountryBadge country={slot.homeTeam} size="xs" /><span className={s.bracketTeamName}>{slot.homeTeam}</span></>
            : <span className={s.bracketTbd}>{slot.homeDesc}</span>
          }
        </div>
        <span className={s.bracketVs}>vs</span>
        <div className={`${s.bracketTeamRow} ${slot.winnerTeam === slot.awayTeam && slot.winnerTeam ? s.bracketWinner : ''}`}>
          {slot.awayTeam
            ? <><CountryBadge country={slot.awayTeam} size="xs" /><span className={s.bracketTeamName}>{slot.awayTeam}</span></>
            : <span className={s.bracketTbd}>{slot.awayDesc}</span>
          }
        </div>
      </div>
      {!hasTeams && <span className={s.bracketPending}>A definir</span>}
    </div>
  )
}

// ── History Modal ─────────────────────────────────────────────────────────────

type ScoredPred = Prediction & { match: Match }

function HistoryModal({ predictions, onClose }: { predictions: ScoredPred[]; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const cravadas = predictions.filter(p => getPredCategory(p.points, true) === 'exact')
  const others   = predictions.filter(p => getPredCategory(p.points, true) !== 'exact')

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Onde ganhei pontos</span>
          <button className={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={s.modalBody}>
          {cravadas.length > 0 && (
            <div className={s.historySection}>
              <div className={s.historySectionTitle}><Target size={12} /> Cravadas ({cravadas.length})</div>
              {cravadas.map(p => (
                <Link key={p.id} to={`/matches/${p.matchId}`} className={s.historyRow} onClick={onClose}>
                  <div className={s.historyTeams}>{p.match.homeTeam} × {p.match.awayTeam}</div>
                  <div className={s.historyRight}>
                    <span className={s.historyPred}>{p.homeScore}×{p.awayScore}</span>
                    <span className={`${s.historyPts} ${s.historyExact}`}><Target size={9} /> +{p.points}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {others.length > 0 && (
            <div className={s.historySection}>
              <div className={s.historySectionTitle}>Outros pontos ({others.length})</div>
              {others.map(p => (
                <Link key={p.id} to={`/matches/${p.matchId}`} className={s.historyRow} onClick={onClose}>
                  <div className={s.historyTeams}>{p.match.homeTeam} × {p.match.awayTeam}</div>
                  <div className={s.historyRight}>
                    <span className={s.historyPred}>{p.homeScore}×{p.awayScore}</span>
                    <span className={`${s.historyPts} ${s.historyGood}`}>+{p.points}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tutorial Modal ────────────────────────────────────────────────────────────

function TutorialModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Como funciona o Bolão?</span>
          <button className={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={s.modalBody}>
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Pontuação</div>
            <div className={s.tutRows}>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><Target size={20} color="var(--c-accent)" /></span>
                <div className={s.tutInfo}><strong>CRAVOU! — Placar exato</strong><span>10 pts (grupos) · 15 pts (mata-mata)</span></div>
              </div>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><CheckCircle2 size={20} color="#eab308" /></span>
                <div className={s.tutInfo}><strong>Resultado certo</strong><span>5 pts (grupos) · 8 pts (mata-mata)</span></div>
              </div>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><SoccerBall size={20} color="#f97316" /></span>
                <div className={s.tutInfo}><strong>Gols de um time certos</strong><span>2 pts em qualquer fase</span></div>
              </div>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><XCircle size={20} color="var(--c-red)" /></span>
                <div className={s.tutInfo}><strong>Errou tudo</strong><span>0 pts</span></div>
              </div>
            </div>
          </div>

          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Exemplo — Brasil 2 × 1 Argentina</div>
            <div className={s.tutExamples}>
              <div className={s.tutEx}><span className={s.tutExScore}>2 × 1</span><span className={s.tutExGreen}><Target size={11} /> +10 pts</span><span className={s.tutExLabel}>CRAVOU!</span></div>
              <div className={s.tutEx}><span className={s.tutExScore}>3 × 0</span><span className={s.tutExYellow}><CheckCircle2 size={11} /> +5 pts</span><span className={s.tutExLabel}>Brasil venceu</span></div>
              <div className={s.tutEx}><span className={s.tutExScore}>2 × 2</span><span className={s.tutExOrange}><SoccerBall size={11} /> +2 pts</span><span className={s.tutExLabel}>gols do Brasil certos</span></div>
              <div className={s.tutEx}><span className={s.tutExScore}>0 × 2</span><span className={s.tutExRed}><XCircle size={11} /> 0 pts</span><span className={s.tutExLabel}>errou tudo</span></div>
            </div>
          </div>

          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Eliminatórias — regras especiais</div>
            <div className={s.tutRows}>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><Target size={20} color="var(--c-accent)" /></span>
                <div className={s.tutInfo}><strong>CRAVOU! — 15 pts</strong><span>Placar exato. Se empate, precisa acertar também quem passa nos pênaltis.</span></div>
              </div>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><CheckCircle2 size={20} color="#eab308" /></span>
                <div className={s.tutInfo}><strong>Resultado certo — 8 pts</strong><span>Acertou a vitória ou o empate.</span></div>
              </div>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><Trophy size={20} color="#f97316" /></span>
                <div className={s.tutInfo}><strong>Palpite de pênaltis</strong><span>Ao prever empate em mata-mata, escolha quem passa nos pênaltis.</span></div>
              </div>
            </div>
          </div>

          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Regras de tempo</div>
            <div className={s.tutCard}>
              <div className={s.tutCardRow}><Lock size={14} /><span>Palpites <strong>bloqueiam 30 minutos</strong> antes do início</span></div>
              <div className={s.tutCardRow}><Clock size={14} /><span>Horário sempre no fuso de <strong>Brasília (BRT)</strong></span></div>
            </div>
          </div>

          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Estados do jogo</div>
            <div className={s.tutCard}>
              <div className={s.tutCardRow}><Calendar size={14} /><span><strong>Agendado</strong> — palpites abertos</span></div>
              <div className={s.tutCardRow}><Lock size={14} /><span><strong>Aguardando início</strong> — palpites fechados</span></div>
              <div className={s.tutCardRow}><span className={s.liveDotInline} /><span><strong>Ao vivo</strong> — jogo em andamento</span></div>
              <div className={s.tutCardRow}><Timer size={14} /><span><strong>Calculando</strong> — admin confirmando placar</span></div>
              <div className={s.tutCardRow}><Flag size={14} /><span><strong>Finalizado</strong> — pontos distribuídos</span></div>
            </div>
          </div>

          <div className={s.tutFooter}>Acerte o placar exato e <strong>CRAVOU!</strong></div>
        </div>
      </div>
    </div>
  )
}
