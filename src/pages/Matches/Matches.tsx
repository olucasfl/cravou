import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMatches, getMyPredictions, type Match, type Prediction } from '@/services/cravouService'
import { formatMatchDate, teamFlag, phaseLabel, statusLabel } from '@/utils/format'
import s from './Matches.module.css'

const FILTERS = [
  { label: 'Todos', value: '' },
  { label: 'Ao vivo', value: 'live' },
  { label: 'Grupos', value: 'group_stage' },
  { label: 'Mata-mata', value: 'round_of_32' },
  { label: 'Encerrados', value: 'finished' },
]

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Map<string, Prediction>>(new Map())
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [all, preds] = await Promise.all([
        getMatches().catch(() => []),
        getMyPredictions().catch(() => []),
      ])
      setMatches(all)
      setPredictions(new Map(preds.map((p) => [p.matchId, p])))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = matches.filter((m) => {
    if (!filter) return true
    if (filter === 'live' || filter === 'finished') return m.status === filter
    if (filter === 'round_of_32') return m.phase !== 'group_stage'
    return m.phase === filter
  })

  return (
    <div className="app-layout">
      <div className="page">
        <div className={s.header}>
          <div className={s.title}>Jogos</div>
          <div className={s.filters}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`${s.filter} ${filter === f.value ? s.active : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.list}>
          {loading && [1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 130 }} />
          ))}

          {!loading && filtered.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyIcon}>⚽</div>
              Nenhum jogo encontrado
            </div>
          )}

          {filtered.map((match) => (
            <MatchCard key={match.id} match={match} prediction={predictions.get(match.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MatchCard({ match, prediction }: { match: Match; prediction?: Prediction }) {
  const hasScore = match.homeScore !== null && match.awayScore !== null

  return (
    <Link
      to={`/matches/${match.id}`}
      className={`${s.card} ${match.status === 'live' ? s.live : ''} ${match.status === 'finished' ? s.finished : ''}`}
    >
      <div className={s.cardTop}>
        <span className={s.groupTag}>
          {match.groupName ? `Grupo ${match.groupName} · R${match.groupRound}` : phaseLabel(match.phase)}
        </span>
        <span className={`${s.cardStatus} ${s[match.status]}`}>
          {match.status === 'live' ? '⬤ Ao vivo' : statusLabel(match.status)}
        </span>
      </div>

      <div className={s.cardBody}>
        <div className={s.team}>
          <div className={s.flag}>{teamFlag(match.homeTeam)}</div>
          <div className={s.teamName}>{match.homeTeam}</div>
        </div>

        <div className={s.middle}>
          {hasScore ? (
            <div className={s.scoreRow}>
              <span className={s.scoreNum}>{match.homeScore}</span>
              <span className={s.scoreSep}>-</span>
              <span className={s.scoreNum}>{match.awayScore}</span>
            </div>
          ) : (
            <div className={s.vs}>VS</div>
          )}
          <div className={s.dateTime}>{formatMatchDate(match.matchDate)}</div>
        </div>

        <div className={`${s.team} ${s.teamAway}`}>
          <div className={s.flag}>{teamFlag(match.awayTeam)}</div>
          <div className={s.teamName}>{match.awayTeam}</div>
        </div>
      </div>

      <div className={s.predRow}>
        <span className={s.predLabel}>Seu palpite</span>
        {prediction ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={s.predScore}>{prediction.homeScore} x {prediction.awayScore}</span>
            {prediction.points !== null && (
              <span className={s.predPoints}>+{prediction.points} pts</span>
            )}
          </div>
        ) : (
          <span className={s.noPred}>
            {match.predictionsLocked ? 'Bloqueado' : 'Palpitar →'}
          </span>
        )}
      </div>
    </Link>
  )
}
