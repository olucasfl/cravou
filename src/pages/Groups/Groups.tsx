import { useMemo, useState } from 'react'
import { Shield, Trophy } from 'lucide-react'
import { type GroupData, type Standing, type BracketSlot } from '@/services/cravouService'
import { CountryBadge } from '@/components/CountryBadge'
import { useAppData } from '@/context/AppDataContext'
import PullToRefresh from '@/components/PullToRefresh/PullToRefresh'
import s from './Groups.module.css'

type MainTab = 'grupos' | 'mata'

const ROUNDS = [
  { value: 'round_of_32',  label: '16 avos',          short: '16av' },
  { value: 'round_of_16',  label: 'Oitavas de final', short: 'Oitavas' },
  { value: 'quarterfinal', label: 'Quartas de final',  short: 'Quartas' },
  { value: 'semifinal',    label: 'Semifinal',         short: 'Semi' },
  { value: 'third_place',  label: 'Disputa do 3º',     short: '3º' },
  { value: 'final',        label: 'Final',             short: 'Final' },
]

const ROUND_SLOT_COUNTS: Record<string, number> = {
  round_of_32: 16,
  round_of_16: 8,
  quarterfinal: 4,
  semifinal: 2,
  third_place: 1,
  final: 1,
}

export default function Groups() {
  const { groups, bracket, loading, refresh } = useAppData()

  const [tab, setTab]           = useState<MainTab>('grupos')
  const [selected, setSelected] = useState<string | null>(null)
  const [bracketRound, setBracketRound] = useState('round_of_32')

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
      id: `placeholder-${bracketRound}-${i + 1}`,
      round: bracketRound,
      slotNumber: i + 1,
      homeDesc: 'A definir',
      awayDesc: 'A definir',
      homeTeam: null,
      awayTeam: null,
      winnerTeam: null,
      matchId: null,
    }))
  }, [bracketByRound, bracketRound])

  const rows: GroupData[][] = []
  for (let i = 0; i < groups.length; i += 2) rows.push(groups.slice(i, i + 2))

  return (
    <PullToRefresh onRefresh={refresh}>
      <div className="app-layout">
        <div className="page fade-up">

          <div className={s.pageHeader}>
            <div className={s.pageTitle}>Copa 2026</div>
            <div className={s.pageTabs}>
              <button
                className={`${s.pageTab} ${tab === 'grupos' ? s.pageTabActive : ''}`}
                onClick={() => setTab('grupos')}
              >
                <Shield size={12} /> Grupos
              </button>
              <button
                className={`${s.pageTab} ${tab === 'mata' ? s.pageTabActive : ''}`}
                onClick={() => setTab('mata')}
              >
                <Trophy size={12} /> Mata-mata
              </button>
            </div>
          </div>

          {/* ══ GRUPOS ══════════════════════════════════════════ */}
          {tab === 'grupos' && (
            <>
              {loading && (
                <div className={s.skeletonGrid}>
                  {[1,2,3,4,5,6].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 110 }} />
                  ))}
                </div>
              )}

              {!loading && (
                <div className={s.rows}>
                  {rows.map((row) => {
                    const activeGroup = row.find((g) => g.group === selected)
                    return (
                      <div key={row[0].group} className={s.rowWrapper}>
                        <div className={s.cardRow}>
                          {row.map(({ group, standings }) => (
                            <div
                              key={group}
                              className={`${s.groupCard} ${selected === group ? s.groupCardActive : ''}`}
                              onClick={() => setSelected(selected === group ? null : group)}
                            >
                              <div className={s.groupLetter}>GRUPO {group}</div>
                              <div className={s.groupTeams}>
                                {standings.slice(0, 4).map((st) => (
                                  <div
                                    key={st.teamName}
                                    className={`${s.groupTeamRow} ${st.isQualified ? s.qualified : ''}`}
                                  >
                                    <CountryBadge country={st.teamName} size="xs" />
                                    <span>{st.teamName}</span>
                                  </div>
                                ))}
                              </div>
                              <div className={s.expandHint}>{selected === group ? '▲' : '▼'}</div>
                            </div>
                          ))}
                        </div>

                        {activeGroup && (
                          <div className={s.accordionPanel}>
                            <StandingsTable group={activeGroup.group} standings={activeGroup.standings} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ══ MATA-MATA ════════════════════════════════════════ */}
          {tab === 'mata' && (
            <>
              {loading && (
                <div className={s.skeletonList}>
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 84, marginBottom: 8 }} />
                  ))}
                </div>
              )}

              {!loading && (
                <>
                  <div className={s.roundTabs}>
                    {ROUNDS.map((r) => (
                      <button
                        key={r.value}
                        className={`${s.roundTab} ${bracketRound === r.value ? s.roundTabActive : ''} ${r.value === 'final' ? s.roundTabFinal : ''}`}
                        onClick={() => setBracketRound(r.value)}
                      >
                        {r.short}
                      </button>
                    ))}
                  </div>

                  <div className={s.roundHeading}>
                    {ROUNDS.find((r) => r.value === bracketRound)?.label}
                    {bracketRound !== 'final' && bracketRound !== 'third_place' && (
                      <span className={s.roundCount}>
                        {currentRoundSlots.length} jogos
                      </span>
                    )}
                  </div>

                  <div className={`${s.bracketGrid} ${bracketRound === 'final' || bracketRound === 'third_place' || bracketRound === 'semifinal' ? s.bracketGridSingle : ''}`}>
                    {currentRoundSlots.map((slot) => (
                      <BracketCard
                        key={slot.id}
                        slot={slot}
                        isFinal={bracketRound === 'final'}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </PullToRefresh>
  )
}

// ── BracketCard ──────────────────────────────────────────────────────────────

function BracketCard({ slot, isFinal }: { slot: BracketSlot; isFinal: boolean }) {
  const homeWon = !!slot.winnerTeam && slot.winnerTeam === slot.homeTeam
  const awayWon = !!slot.winnerTeam && slot.winnerTeam === slot.awayTeam
  const settled = !!slot.winnerTeam

  return (
    <div className={`${s.bCard} ${settled ? s.bCardDone : ''} ${isFinal ? s.bCardFinal : ''}`}>
      <div className={s.bHeader}>
        <span className={s.bSlot}>Confronto {slot.slotNumber}</span>
        {isFinal && <span className={s.bFinalBadge}><Trophy size={10} /> Final</span>}
      </div>

      <div className={`${s.bTeam} ${homeWon ? s.bWinner : ''} ${settled && !homeWon ? s.bLoser : ''} ${!slot.homeTeam ? s.bTbd : ''}`}>
        {slot.homeTeam ? (
          <>
            <CountryBadge country={slot.homeTeam} size="sm" />
            <span className={s.bName}>{slot.homeTeam}</span>
          </>
        ) : (
          <span className={s.bDesc}>{slot.homeDesc || '—'}</span>
        )}
        {homeWon && <span className={s.bAdvancesBadge}>Avança</span>}
      </div>

      <div className={s.bDivider} />

      <div className={`${s.bTeam} ${awayWon ? s.bWinner : ''} ${settled && !awayWon ? s.bLoser : ''} ${!slot.awayTeam ? s.bTbd : ''}`}>
        {slot.awayTeam ? (
          <>
            <CountryBadge country={slot.awayTeam} size="sm" />
            <span className={s.bName}>{slot.awayTeam}</span>
          </>
        ) : (
          <span className={s.bDesc}>{slot.awayDesc || '—'}</span>
        )}
        {awayWon && <span className={s.bAdvancesBadge}>Avança</span>}
      </div>
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
                  <span className={`${s.pos} ${idx < 2 ? s.top : ''}`}>
                    {st.position ?? idx + 1}
                  </span>
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
