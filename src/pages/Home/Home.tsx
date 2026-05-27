import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy, HelpCircle, X,
  Lock, Clock, Target, CheckCircle2, XCircle,
  Calendar, Flag, Timer,
} from 'lucide-react'
import { getMe, type User } from '@/services/authService'
import { getMatches, type Match } from '@/services/cravouService'
import { formatMatchDate } from '@/utils/format'
import { CountryBadge } from '@/components/CountryBadge'
import { SoccerBall } from '@/components/icons/SoccerBall'
import { useSocketEvent } from '@/hooks/useSocketEvent'
import s from './Home.module.css'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [upcoming, setUpcoming] = useState<Match[]>([])
  const [live, setLive] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [showTutorial, setShowTutorial] = useState(false)

  const load = useCallback(async () => {
    const [u, all] = await Promise.all([
      getMe().catch(() => null),
      getMatches().catch(() => []),
    ])
    setUser(u)
    setLive(all.filter((m) => m.status === 'live'))
    setUpcoming(all.filter((m) => m.status === 'upcoming').slice(0, 5))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useSocketEvent('match:updated', load)
  useSocketEvent('match:locked', load)

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
          <div className={s.headerRight}>
            <button className={s.howBtn} onClick={() => setShowTutorial(true)}>
              <HelpCircle size={14} /> Como funciona?
            </button>
            <div className={s.avatar}>{initials}</div>
          </div>
        </div>

        {/* Pontuação */}
        <div className={s.scoreCard}>
          <div>
            <div className={s.scoreLabel}>Seus pontos</div>
            <div className={s.scoreValue}>{loading ? '—' : (user?.bolaoPoints ?? 0)}</div>
            <div className={s.scoreSub}>no bolão</div>
          </div>
          <div className={s.scoreIcon}>
            <Trophy size={28} color="var(--c-accent)" />
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
              <div className={s.emptyIcon}><SoccerBall size={36} /></div>
              Nenhum jogo agendado
            </div>
          )}
          {upcoming.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      </div>

      <BottomNavPlaceholder />
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
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
          <CountryBadge country={match.homeTeam} size="sm" />
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
          <CountryBadge country={match.awayTeam} size="sm" />
          <div className={s.teamName}>{match.awayTeam}</div>
        </div>
      </div>
    </Link>
  )
}

function BottomNavPlaceholder() {
  return null
}

function TutorialModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Como funciona o Bolão?</span>
          <button className={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={s.modalBody}>
          {/* Pontuação */}
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Pontuação</div>
            <div className={s.tutRows}>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><Target size={20} color="var(--c-accent)" /></span>
                <div className={s.tutInfo}>
                  <strong>Placar exato</strong>
                  <span>10 pts (grupos) · 15 pts (mata-mata)</span>
                </div>
              </div>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><CheckCircle2 size={20} color="#eab308" /></span>
                <div className={s.tutInfo}>
                  <strong>Resultado certo</strong>
                  <span>5 pts (grupos) · 8 pts (mata-mata)</span>
                </div>
              </div>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><SoccerBall size={20} color="#f97316" /></span>
                <div className={s.tutInfo}>
                  <strong>Gols de um time certos</strong>
                  <span>2 pts em qualquer fase</span>
                </div>
              </div>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><XCircle size={20} color="var(--c-red)" /></span>
                <div className={s.tutInfo}>
                  <strong>Errou tudo</strong>
                  <span>0 pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exemplos */}
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Exemplo — Brasil 2 × 1 Argentina</div>
            <div className={s.tutExamples}>
              <div className={s.tutEx}>
                <span className={s.tutExScore}>2 × 1</span>
                <span className={s.tutExGreen}><Target size={11} /> +10 pts</span>
                <span className={s.tutExLabel}>placar exato</span>
              </div>
              <div className={s.tutEx}>
                <span className={s.tutExScore}>3 × 0</span>
                <span className={s.tutExYellow}><CheckCircle2 size={11} /> +5 pts</span>
                <span className={s.tutExLabel}>Brasil venceu</span>
              </div>
              <div className={s.tutEx}>
                <span className={s.tutExScore}>2 × 2</span>
                <span className={s.tutExOrange}><SoccerBall size={11} /> +2 pts</span>
                <span className={s.tutExLabel}>gols do Brasil certos</span>
              </div>
              <div className={s.tutEx}>
                <span className={s.tutExScore}>0 × 2</span>
                <span className={s.tutExRed}><XCircle size={11} /> 0 pts</span>
                <span className={s.tutExLabel}>errou tudo</span>
              </div>
            </div>
          </div>

          {/* Regras de tempo */}
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Regras de tempo</div>
            <div className={s.tutCard}>
              <div className={s.tutCardRow}><Lock size={14} /><span>Palpites <strong>bloqueiam 30 minutos</strong> antes do início</span></div>
              <div className={s.tutCardRow}><Clock size={14} /><span>Após o bloqueio, não é possível palpitar ou alterar</span></div>
              <div className={s.tutCardRow}><Clock size={14} /><span>Horário sempre no fuso de <strong>Brasília (BRT)</strong></span></div>
            </div>
          </div>

          {/* Estados do jogo */}
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

          <div className={s.tutFooter}>
            Boa sorte no bolão da Copa 2026!
          </div>
        </div>
      </div>
    </div>
  )
}
