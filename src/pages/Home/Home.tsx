import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { getMe, type User } from '@/services/authService'
import { getMatches, type Match } from '@/services/cravouService'
import { formatMatchDate, teamFlag } from '@/utils/format'
import s from './Home.module.css'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [upcoming, setUpcoming] = useState<Match[]>([])
  const [live, setLive] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [u, all] = await Promise.all([
        getMe().catch(() => null),
        getMatches().catch(() => []),
      ])
      setUser(u)
      setLive(all.filter((m) => m.status === 'live'))
      setUpcoming(all.filter((m) => m.status === 'upcoming').slice(0, 5))
      setLoading(false)
    }
    load()
  }, [])

  const initials = user?.name?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <div className="app-layout">
      <div className="page fade-up">
        {/* Header */}
        <div className={s.header}>
          <div>
            <div className={s.greeting}>Olá,</div>
            <div className={s.name}>{user?.name ?? '...'}</div>
          </div>
          <div className={s.avatar}>{initials}</div>
        </div>

        {/* Pontuação */}
        <div className={s.scoreCard}>
          <div>
            <div className={s.scoreLabel}>Seus pontos</div>
            <div className={s.scoreValue}>{loading ? '—' : (user?.bolaoPoints ?? 0)}</div>
            <div className={s.scoreSub}>no bolão</div>
          </div>
          <div className={s.scoreIcon}>
            <Trophy size={28} color="#000" />
          </div>
        </div>

        {/* Ao vivo */}
        {live.length > 0 && (
          <div className={s.section}>
            <div className={s.sectionHeader}>
              <span className={s.sectionTitle}>Ao vivo agora</span>
              <span className={s.live}>
                <span className={s.liveDot} /> Live
              </span>
            </div>
            {live.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}

        {/* Próximos */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <span className={s.sectionTitle}>Próximos jogos</span>
            <Link to="/matches" className={s.seeAll}>Ver todos</Link>
          </div>
          {loading && (
            <>
              <div className="skeleton" style={{ height: 100, marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 100, marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 100 }} />
            </>
          )}
          {!loading && upcoming.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyIcon}>⚽</div>
              Nenhum jogo agendado
            </div>
          )}
          {upcoming.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      </div>

      <BottomNavPlaceholder />
    </div>
  )
}

function MatchCard({ match }: { match: Match }) {
  return (
    <Link to={`/matches/${match.id}`} className={s.matchCard}>
      <div className={s.matchMeta}>
        <span className={s.matchGroup}>
          {match.groupName ? `Grupo ${match.groupName}` : match.phase.replace(/_/g, ' ')}
        </span>
        <span className={s.matchDate}>{formatMatchDate(match.matchDate)}</span>
      </div>
      <div className={s.matchTeams}>
        <div className={s.team}>
          <div className={s.teamFlag}>{teamFlag(match.homeTeam)}</div>
          <div className={s.teamName}>{match.homeTeam}</div>
        </div>
        <div className={s.score}>
          {match.status === 'finished' || match.status === 'live' ? (
            <>
              <span className={s.scoreNum}>{match.homeScore ?? 0}</span>
              <span className={s.scoreSep}>-</span>
              <span className={s.scoreNum}>{match.awayScore ?? 0}</span>
            </>
          ) : (
            <span className={s.vs}>VS</span>
          )}
        </div>
        <div className={s.team}>
          <div className={s.teamFlag}>{teamFlag(match.awayTeam)}</div>
          <div className={s.teamName}>{match.awayTeam}</div>
        </div>
      </div>
    </Link>
  )
}

function BottomNavPlaceholder() {
  return null
}
