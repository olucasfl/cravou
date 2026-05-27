import { useEffect, useState } from 'react'
import { getAllGroups, type GroupData, type Standing } from '@/services/cravouService'
import { CountryBadge } from '@/components/CountryBadge'
import s from './Groups.module.css'

export default function Groups() {
  const [groups, setGroups] = useState<GroupData[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllGroups()
      .then(setGroups)
      .finally(() => setLoading(false))
  }, [])

  // Pair groups into rows of 2 for inline accordion
  const rows: GroupData[][] = []
  for (let i = 0; i < groups.length; i += 2) {
    rows.push(groups.slice(i, i + 2))
  }

  return (
    <div className="app-layout">
      <div className="page fade-up">
        <div className={s.title}>Grupos</div>

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
                        <div className={s.expandHint}>
                          {selected === group ? '▲' : '▼'}
                        </div>
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
      </div>
    </div>
  )
}

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
