import { useEffect, useState } from 'react'
import { getAllGroups, type GroupData, type Standing } from '@/services/cravouService'
import { teamFlag } from '@/utils/format'
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

  const selectedGroup = groups.find((g) => g.group === selected)

  return (
    <div className="app-layout">
      <div className="page fade-up">
        <div className={s.title}>Grupos</div>

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="skeleton" style={{ height: 110 }} />
            ))}
          </div>
        )}

        {!loading && (
          <div className={s.grid}>
            {groups.map(({ group, standings }) => (
              <div
                key={group}
                className={s.groupCard}
                onClick={() => setSelected(selected === group ? null : group)}
                style={selected === group ? { borderColor: 'var(--c-green)' } : {}}
              >
                <div className={s.groupLetter}>GRUPO {group}</div>
                <div className={s.groupTeams}>
                  {standings.slice(0, 4).map((st) => (
                    <div
                      key={st.teamName}
                      className={`${s.groupTeamRow} ${st.isQualified ? s.qualified : ''}`}
                    >
                      <span className={s.teamFlagSm}>{teamFlag(st.teamName)}</span>
                      <span>{st.teamName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedGroup && (
          <StandingsTable group={selectedGroup.group} standings={selectedGroup.standings} />
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
            <tr key={st.teamName} className={`${s.tr} ${st.isQualified ? s.qualified : ''}`}>
              <td className={`${s.td}`}>
                <div className={s.tdTeam}>
                  <span className={`${s.pos} ${idx < 2 ? s.top : ''}`}>
                    {st.position ?? idx + 1}
                  </span>
                  <span>{teamFlag(st.teamName)}</span>
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
