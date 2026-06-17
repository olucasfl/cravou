import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  HelpCircle, X, Lock, Clock, Target, CheckCircle2, XCircle, Trophy,
  Calendar, Flag, ChevronRight, Crown, Zap, Minus,
} from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { type Match, type Prediction, type GroupData, type Standing, type BracketSlot } from '@/services/cravouService'
import { formatMatchDate, formatTimeUntilClose, isWithinMinutes, phaseLabel, getPredCategory } from '@/utils/format'
import { CountryBadge } from '@/components/CountryBadge'
import { SoccerBall } from '@/components/icons/SoccerBall'
import PullToRefresh from '@/components/PullToRefresh/PullToRefresh'
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

const STATUS_ORDER: Record<string, number> = { live: 0, awaiting_result: 1, locked: 2, upcoming: 3 }

export default function Home() {
  const { user, matches: allMatches, predictions: myPredictions, ranking, groups, bracket, loading, refresh } = useAppData()

  const [showTutorial, setShowTutorial]         = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [nowMs, setNowMs]                       = useState(Date.now)
  const [mainTab, setMainTab]                   = useState<MainTab>('jogos')
  const [copaTab, setCopaTab]                   = useState<CopaTab>('grupos')
  const [bracketRound, setBracketRound]         = useState('round_of_32')
  const [selectedGroup, setSelectedGroup]       = useState<string | null>(null)

  useEffect(() => {
    const iv = setInterval(() => setNowMs(Date.now()), 15_000)
    return () => clearInterval(iv)
  }, [])

  // ── Computed ───────────────────────────────────────────────

  const myPosition = useMemo(() => {
    if (!user) return null
    return ranking.find(r => r.userId === user.id)?.position ?? null
  }, [ranking, user])

  const predMap  = useMemo(() => new Map(myPredictions.map(p => [p.matchId, p])), [myPredictions])
  const matchMap = useMemo(() => new Map(allMatches.map(m => [m.id, m])), [allMatches])

  const visibleMatches = useMemo(() =>
    allMatches
      .filter(m => m.status !== 'finished')
      .sort((a, b) => {
        const oa = STATUS_ORDER[a.status] ?? 3
        const ob = STATUS_ORDER[b.status] ?? 3
        if (oa !== ob) return oa - ob
        return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      }),
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

  const initials = user?.name?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <PullToRefresh onRefresh={refresh}>
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

              {!loading && visibleMatches.length === 0 && (
                <div className={s.empty}><div className={s.emptyIcon}><SoccerBall size={36} /></div>Nenhum jogo ativo</div>
              )}

              {!loading && visibleMatches.slice(0, 8).map(m => (
                <MatchCard key={`${m.id}-${m.status}`} match={m} pred={predMap.get(m.id)} nowMs={nowMs} />
              ))}

              {!loading && visibleMatches.length > 0 && (
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
    </PullToRefresh>
  )
}

// ── MatchCard ─────────────────────────────────────────────────────────────────

function MatchCard({ match: m, pred, nowMs }: { match: Match; pred?: Prediction; nowMs: number }) {
  const isLive             = m.status === 'live'
  const isCalc             = m.status === 'awaiting_result'
  const isWaiting          = m.status === 'locked' || (m.status === 'upcoming' && m.predictionsLocked)
  const isOpen             = m.status === 'upcoming' && !m.predictionsLocked
  const closeAt            = new Date(m.matchDate).getTime() - 10 * 60_000
  const closeAlreadyPassed = isOpen && closeAt <= nowMs
  const closingVerySoon    = isOpen && !closeAlreadyPassed && isWithinMinutes(m.matchDate, 10)
  const closingSoon        = isOpen && !closeAlreadyPassed && isWithinMinutes(m.matchDate, 60)
  const hasScore           = m.homeScore !== null && m.awayScore !== null

  const borderCls = isLive        ? s.cardBorderLive
    : isCalc                      ? s.cardBorderCalc
    : isWaiting                   ? s.cardBorderLocked
    : closingVerySoon             ? s.cardUrgent
    : ''

  const statusChip = isLive
    ? <span className={`${s.chip} ${s.chipLive}`}><span className={s.chipDot} /> Ao vivo</span>
    : isCalc
    ? <span className={`${s.chip} ${s.chipCalc}`}><span className={s.chipSpinner} /> Calculando</span>
    : isWaiting
    ? <span className={`${s.chip} ${s.chipLocked}`}><Lock size={10} /> Aguardando início</span>
    : closingVerySoon
    ? <span className={`${s.chip} ${s.chipUrgent}`}><Zap size={10} /> Fecha em {formatTimeUntilClose(m.matchDate)}</span>
    : closingSoon
    ? <span className={`${s.chip} ${s.chipWarn}`}><Clock size={10} /> Fecha em {formatTimeUntilClose(m.matchDate)}</span>
    : <span className={`${s.chip} ${s.chipDefault}`}>Agendado</span>

  return (
    <Link to={`/matches/${m.id}`} className={`${s.matchCard} ${borderCls}`}>
      <div className={s.matchMeta}>
        <span className={s.matchGroup}>
          {m.groupName ? `Grupo ${m.groupName}` : phaseLabel(m.phase)}
        </span>
        {statusChip}
      </div>
      <div className={s.matchTeams}>
        <div className={s.team}>
          <CountryBadge country={m.homeTeam} size="sm" />
          <div className={s.teamName}>{m.homeTeam}</div>
        </div>
        <div className={s.middle}>
          <div className={s.score}>
            {hasScore ? (
              <>
                <span className={`${s.scoreNum} ${isLive ? s.scoreNumLive : ''}`}>{m.homeScore}</span>
                <span className={s.scoreSep}>-</span>
                <span className={`${s.scoreNum} ${isLive ? s.scoreNumLive : ''}`}>{m.awayScore}</span>
              </>
            ) : (
              <span className={s.vs}>VS</span>
            )}
          </div>
          <div className={s.matchDateTime}>{formatMatchDate(m.matchDate)}</div>
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

  const byCategory = (cat: string) =>
    predictions
      .filter(p => getPredCategory(p.points, true, p.match.phase) === cat)
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))

  const cravadas = byCategory('exact')
  const bonus    = byCategory('bonus')
  const right    = byCategory('right')
  const partial  = byCategory('partial')

  const renderRows = (list: ScoredPred[], ptClass: string, icon?: React.ReactNode) =>
    list.map(p => (
      <Link key={p.id} to={`/matches/${p.matchId}`} className={s.historyRow} onClick={onClose}>
        <div className={s.historyTeams}>{p.match.homeTeam} × {p.match.awayTeam}</div>
        <div className={s.historyRight}>
          <span className={s.historyPred}>{p.homeScore}×{p.awayScore}</span>
          <span className={`${s.historyPts} ${ptClass}`}>{icon} +{p.points}</span>
        </div>
      </Link>
    ))

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
              <div className={`${s.historySectionTitle} ${s.historySectionExact}`}>
                <Target size={12} /> Cravou! ({cravadas.length})
              </div>
              {renderRows(cravadas, s.historyExact, <Target size={9} />)}
            </div>
          )}
          {bonus.length > 0 && (
            <div className={s.historySection}>
              <div className={`${s.historySectionTitle} ${s.historySectionBonus}`}>
                <Zap size={12} /> Bônus ({bonus.length})
              </div>
              {renderRows(bonus, s.historyBonus, <Zap size={9} />)}
            </div>
          )}
          {right.length > 0 && (
            <div className={s.historySection}>
              <div className={`${s.historySectionTitle} ${s.historySectionRight}`}>
                <CheckCircle2 size={12} /> Acertou o Vencedor ({right.length})
              </div>
              {renderRows(right, s.historyGood)}
            </div>
          )}
          {partial.length > 0 && (
            <div className={s.historySection}>
              <div className={`${s.historySectionTitle} ${s.historySectionPartial}`}>
                <Minus size={12} /> Parcial ({partial.length})
              </div>
              {renderRows(partial, s.historyPartial)}
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

          {/* ── Como participar ── */}
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Como participar</div>
            <div className={s.tutSteps}>
              <div className={s.tutStep}>
                <span className={s.tutStepNum}>1</span>
                <div className={s.tutStepText}>
                  <strong>Escolha um jogo</strong>
                  <span>Acesse a aba <em>Jogos</em> e toque em qualquer partida agendada.</span>
                </div>
              </div>
              <div className={s.tutStep}>
                <span className={s.tutStepNum}>2</span>
                <div className={s.tutStepText}>
                  <strong>Palpite no placar</strong>
                  <span>Digite quantos gols cada time vai fazer e confirme.</span>
                </div>
              </div>
              <div className={s.tutStep}>
                <span className={s.tutStepNum}>3</span>
                <div className={s.tutStepText}>
                  <strong>Ganhe pontos</strong>
                  <span>Após o apito final, os pontos são calculados automaticamente.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Pontuação ── */}
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Pontuação</div>
            <div className={s.tutScoreGrid}>
              <div className={s.tutScoreHeader}>
                <span />
                <span className={s.tutScorePhase}>Grupos</span>
                <span className={s.tutScorePhase}>Mata-mata</span>
              </div>
              <div className={`${s.tutScoreRow} ${s.tutScoreExact}`}>
                <div className={s.tutScoreLabel}>
                  <Target size={13} />
                  <span>CRAVOU! — placar exato</span>
                </div>
                <span className={s.tutScorePts}>10 pts</span>
                <span className={s.tutScorePts}>15 pts</span>
              </div>
              <div className={`${s.tutScoreRow} ${s.tutScoreRight}`}>
                <div className={s.tutScoreLabel}>
                  <CheckCircle2 size={13} />
                  <span>Resultado certo</span>
                </div>
                <span className={s.tutScorePts}>5 pts</span>
                <span className={s.tutScorePts}>8 pts</span>
              </div>
              <div className={`${s.tutScoreRow} ${s.tutScoreBonus}`}>
                <div className={s.tutScoreLabel}>
                  <Zap size={13} />
                  <span>Resultado + bônus de gols</span>
                </div>
                <span className={s.tutScorePts}>7 pts</span>
                <span className={s.tutScorePts}>10 pts</span>
              </div>
              <div className={`${s.tutScoreRow} ${s.tutScorePartial}`}>
                <div className={s.tutScoreLabel}>
                  <SoccerBall size={13} />
                  <span>Gols de um time certos</span>
                </div>
                <span className={s.tutScorePts}>2 pts</span>
                <span className={s.tutScorePts}>2 pts</span>
              </div>
              <div className={`${s.tutScoreRow} ${s.tutScoreWrong}`}>
                <div className={s.tutScoreLabel}>
                  <XCircle size={13} />
                  <span>Errou tudo</span>
                </div>
                <span className={s.tutScorePts}>0 pts</span>
                <span className={s.tutScorePts}>0 pts</span>
              </div>
            </div>
            <div className={s.tutNote}>
              O bônus se <strong>soma</strong> ao resultado certo — acertou o vencedor <strong>e</strong> os gols de um time? Ganha resultado + 2 de bônus ao mesmo tempo.
            </div>
          </div>

          {/* ── Exemplo ── */}
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Exemplo — Brasil 2 × 1 Argentina (grupos)</div>
            <div className={s.tutExamples}>
              <div className={s.tutEx}><span className={s.tutExScore}>2 × 1</span><span className={s.tutExGreen}><Target size={11} /> +10 pts</span><span className={s.tutExLabel}>CRAVOU! — placar exato</span></div>
              <div className={s.tutEx}><span className={s.tutExScore}>3 × 1</span><span className={s.tutExLime}><Zap size={11} /> +7 pts</span><span className={s.tutExLabel}>Brasil venceu + 1 gol da Argentina ✓</span></div>
              <div className={s.tutEx}><span className={s.tutExScore}>3 × 0</span><span className={s.tutExYellow}><CheckCircle2 size={11} /> +5 pts</span><span className={s.tutExLabel}>Brasil venceu (sem gols certos)</span></div>
              <div className={s.tutEx}><span className={s.tutExScore}>0 × 1</span><span className={s.tutExOrange}><SoccerBall size={11} /> +2 pts</span><span className={s.tutExLabel}>1 gol da Argentina ✓ (errou resultado)</span></div>
              <div className={s.tutEx}><span className={s.tutExScore}>0 × 3</span><span className={s.tutExRed}><XCircle size={11} /> 0 pts</span><span className={s.tutExLabel}>errou tudo</span></div>
            </div>
          </div>

          {/* ── Bônus de gols ── */}
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Bônus de gols (+2 pts)</div>
            <div className={s.tutCard}>
              <div className={s.tutCardRow}>
                <Zap size={14} color="#84cc16" />
                <span>Acertou o <strong>resultado</strong> (quem ganhou ou empate) <strong>e</strong> a quantidade de gols de um time? Os +2 de bônus se <strong>somam</strong> ao resultado certo.</span>
              </div>
              <div className={s.tutCardRow}>
                <CheckCircle2 size={14} color="#84cc16" />
                <span>Grupos: <strong>5 + 2 = 7 pts</strong> · Mata-mata: <strong>8 + 2 = 10 pts</strong></span>
              </div>
              <div className={s.tutCardRow}>
                <XCircle size={14} color="var(--c-text-3)" />
                <span>O bônus <strong>não</strong> vale se errar o resultado — acertar gols de um time sem acertar quem ganhou vale apenas 2 pts (parcial).</span>
              </div>
            </div>
          </div>

          {/* ── Mata-mata: pênaltis ── */}
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Mata-mata — Regra dos pênaltis</div>
            <div className={s.tutCard}>
              <div className={s.tutCardRow}>
                <Trophy size={14} color="#f97316" />
                <span>Ao palpitar <strong>empate</strong> em jogo de mata-mata, você deve escolher também <strong>qual time passa nos pênaltis</strong>.</span>
              </div>
              <div className={s.tutCardRow}>
                <Target size={14} color="var(--c-accent)" />
                <span>Para ganhar <strong>CRAVOU! (15 pts)</strong> no mata-mata, precisa acertar o placar <strong>e</strong> o time que avança nos pênaltis (se houver).</span>
              </div>
              <div className={s.tutCardRow}>
                <CheckCircle2 size={14} color="#eab308" />
                <span>Acertou o empate mas errou quem passa nos pênaltis? Você ainda ganha <strong>8 pts</strong> (resultado certo).</span>
              </div>
            </div>
          </div>

          {/* ── Prazo ── */}
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Prazo dos palpites</div>
            <div className={s.tutCard}>
              <div className={s.tutCardRow}><Lock size={14} /><span>Palpites <strong>bloqueiam 10 minutos</strong> antes do início da partida.</span></div>
              <div className={s.tutCardRow}><Clock size={14} /><span>Você pode alterar seu palpite <strong>quantas vezes quiser</strong> antes do bloqueio.</span></div>
              <div className={s.tutCardRow}><Calendar size={14} /><span>Todos os horários são no fuso de <strong>Brasília (BRT / UTC-3)</strong>.</span></div>
            </div>
          </div>

          {/* ── Status ── */}
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Status das partidas</div>
            <div className={s.tutStatusList}>
              <div className={s.tutStatusRow}>
                <span className={`${s.tutStatusBadge} ${s.tutStatusOpen}`}>Agendado</span>
                <span>Palpites <strong>abertos</strong> — você pode palpitar ou editar.</span>
              </div>
              <div className={s.tutStatusRow}>
                <span className={`${s.tutStatusBadge} ${s.tutStatusLocked}`}>Aguardando</span>
                <span>Palpites <strong>bloqueados</strong> — jogo prestes a começar.</span>
              </div>
              <div className={s.tutStatusRow}>
                <span className={`${s.tutStatusBadge} ${s.tutStatusLive}`}><span className={s.liveDotInline} /> Ao vivo</span>
                <span>Partida em andamento.</span>
              </div>
              <div className={s.tutStatusRow}>
                <span className={`${s.tutStatusBadge} ${s.tutStatusCalc}`}>Calculando</span>
                <span>Placar sendo <strong>confirmado</strong> pelo administrador.</span>
              </div>
              <div className={s.tutStatusRow}>
                <span className={`${s.tutStatusBadge} ${s.tutStatusDone}`}>Encerrado</span>
                <span>Pontos <strong>distribuídos</strong> — resultado final.</span>
              </div>
            </div>
          </div>

          {/* ── Ranking ── */}
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Ranking</div>
            <div className={s.tutCard}>
              <div className={s.tutCardRow}><Trophy size={14} color="#eab308" /><span>O ranking geral é ordenado pelos <strong>pontos totais</strong> acumulados em todas as partidas.</span></div>
              <div className={s.tutCardRow}><Target size={14} color="var(--c-accent)" /><span>Existe também um ranking de <strong>Cravadas</strong> — quantos placares exatos você acertou.</span></div>
              <div className={s.tutCardRow}><Flag size={14} /><span>Em caso de empate de pontos, quem tiver mais cravadas fica melhor posicionado.</span></div>
            </div>
          </div>

          <div className={s.tutFooter}>Acerte o placar exato e <strong>CRAVOU!</strong></div>
        </div>
      </div>
    </div>
  )
}
