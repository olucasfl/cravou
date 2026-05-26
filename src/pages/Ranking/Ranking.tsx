import { useEffect, useState } from 'react'
import { getRanking, type RankingEntry } from '@/services/cravouService'
import { getMe } from '@/services/authService'
import s from './Ranking.module.css'

export default function Ranking() {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [r, me] = await Promise.all([
        getRanking().catch(() => []),
        getMe().catch(() => null),
      ])
      setRanking(r)
      setMyId(me?.id ?? null)
      setLoading(false)
    }
    load()
  }, [])

  const showPodium = ranking.length >= 3
  const top3 = ranking.slice(0, 3)
  const listItems = showPodium ? ranking.slice(3) : ranking

  return (
    <div className="app-layout">
      <div className="page fade-up">
        <div className={s.title}>Ranking</div>

        {loading && [1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8 }} />
        ))}

        {!loading && ranking.length === 0 && (
          <div className={s.empty}>
            <div className={s.emptyIcon}>🏆</div>
            <div className={s.emptyTitle}>Nenhum palpite pontuado ainda</div>
            <div className={s.emptySub}>O ranking aparecerá quando as partidas forem encerradas</div>
          </div>
        )}

        {!loading && showPodium && (
          <div className={s.podium}>
            {[1, 0, 2].map((idx) => {
              const e = top3[idx]
              if (!e) return null
              const cls = idx === 0 ? s.first : idx === 1 ? s.second : s.third
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={e.userId} className={`${s.podiumItem} ${cls}`}>
                  {idx === 0 && <div className={s.podiumCrown}>👑</div>}
                  <div className={s.podiumAvatar}>{e.name.slice(0, 2).toUpperCase()}</div>
                  <div className={s.podiumName}>{e.name}{e.userId === myId ? ' (você)' : ''}</div>
                  <div className={s.podiumPts}>{e.points}</div>
                  <div className={s.podiumPtsLabel}>pts</div>
                  <div className={s.podiumBar} />
                </div>
              )
            })}
          </div>
        )}

        {!loading && ranking.length > 0 && (
          <div className={s.list}>
            {listItems.map((e) => (
              <div key={e.userId} className={`${s.item} ${e.userId === myId ? s.me : ''}`}>
                <div className={s.pos}>#{e.position}</div>
                <div className={s.avatar}>{e.name.slice(0, 2).toUpperCase()}</div>
                <div className={s.name}>{e.name}{e.userId === myId ? ' (você)' : ''}</div>
                <div className={s.ptsBlock}>
                  <div className={s.pts}>{e.points}</div>
                  <div className={s.ptsLabel}>pts</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
