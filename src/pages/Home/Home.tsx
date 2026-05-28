import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  HelpCircle, X,
  Lock, Clock, Target, CheckCircle2, XCircle, Trophy,
  Calendar, Flag, Timer, ChevronRight, Crown,
} from 'lucide-react'
import { getMe, type User } from '@/services/authService'
import {
  getMatches, getMyPredictions, getRanking,
  type Match, type Prediction,
} from '@/services/cravouService'
import { formatMatchDate, getPredCategory } from '@/utils/format'
import { clearCache } from '@/utils/cache'
import { CountryBadge } from '@/components/CountryBadge'
import { SoccerBall } from '@/components/icons/SoccerBall'
import { useSocketEvent } from '@/hooks/useSocketEvent'
import s from './Home.module.css'

export default function Home() {
  const [user, setUser]             = useState<User | null>(null)
  const [upcoming, setUpcoming]     = useState<Match[]>([])
  const [live, setLive]             = useState<Match[]>([])
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [myPredictions, setMyPredictions] = useState<Prediction[]>([])
  const [myPosition, setMyPosition] = useState<number | null>(null)
  const [loading, setLoading]       = useState(true)
  const [showTutorial, setShowTutorial]   = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const load = useCallback(async () => {
    const [u, all, preds, ranking] = await Promise.all([
      getMe().catch(() => null),
      getMatches().catch(() => []),
      getMyPredictions().catch(() => []),
      getRanking().catch(() => []),
    ])
    setUser(u)
    setAllMatches(all)
    setLive(all.filter((m) => m.status === 'live'))
    setUpcoming(all.filter((m) => m.status === 'upcoming').slice(0, 5))
    setMyPredictions(preds)
    if (u) {
      const entry = ranking.find((r) => r.userId === u.id)
      setMyPosition(entry?.position ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Socket: limpa cache dos dados afetados antes de recarregar
  useSocketEvent('match:updated', useCallback(() => { clearCache('matches', 'ranking', 'predictions'); load() }, [load]))
  useSocketEvent('match:locked',  useCallback(() => { clearCache('matches'); load() }, [load]))

  // ── Computed ─────────────────────────────────────────────

  const matchMap = useMemo(() => {
    const m = new Map<string, Match>()
    allMatches.forEach((match) => m.set(match.id, match))
    return m
  }, [allMatches])

  const scoredPredictions = useMemo(() =>
    myPredictions
      .filter((p) => p.points !== null && p.points > 0)
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      .map((p) => ({ ...p, match: matchMap.get(p.matchId) }))
      .filter((p) => p.match != null) as (Prediction & { match: Match })[],
    [myPredictions, matchMap]
  )

  const finishedCount = allMatches.filter((m) => m.status === 'finished').length
  const totalMatches  = allMatches.length
  const progressPct   = totalMatches > 0 ? Math.round((finishedCount / totalMatches) * 100) : 0

  const initials = user?.name?.slice(0, 2).toUpperCase() ?? '?'

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

        {/* ── Score Card ────────────────────────────────────── */}
        <div className={s.scoreCard}>

          {/* Top row: label + rank badge */}
          <div className={s.scoreCardTop}>
            <span className={s.scoreLabel}>Seus pontos</span>
            {!loading && myPosition && (
              <span className={s.rankBadge}>
                <Crown size={11} />
                #{myPosition} no ranking
              </span>
            )}
          </div>

          {/* Points + icon */}
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

          {/* Cravadas */}
          <div className={s.cravasRow}>
            <Target size={13} className={s.cravasIcon} />
            {loading
              ? <div className="skeleton" style={{ width: 32, height: 16, borderRadius: 99, display: 'inline-block' }} />
              : <span className={s.cravasValue}>{user?.cravadas ?? 0}</span>
            }
            <span className={s.cravasLabel}>cravadas</span>
          </div>

          {/* History button */}
          {!loading && scoredPredictions.length > 0 && (
            <button className={s.historyToggle} onClick={() => setShowHistoryModal(true)}>
              <Target size={11} />
              Ver onde ganhei pontos ({scoredPredictions.length})
              <ChevronRight size={12} />
            </button>
          )}
        </div>

        {/* ── Tournament Progress ───────────────────────────── */}
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

        {/* ── Ao vivo ───────────────────────────────────────── */}
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

        {/* ── Próximos ──────────────────────────────────────── */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <span className={s.sectionTitle}>Próximos jogos</span>
            <Link to="/matches" className={s.seeAll}>Ver todos</Link>
          </div>
          {loading && [1,2,3].map(i => (
            <div key={i} className={s.matchCardSkeleton}>
              <div className="skeleton" style={{ width: 70, height: 10, borderRadius: 99, marginBottom: 10 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                <div className="skeleton" style={{ flex: 1, height: 13, borderRadius: 99 }} />
                <div className="skeleton" style={{ width: 44, height: 22, borderRadius: 8, flexShrink: 0 }} />
                <div className="skeleton" style={{ flex: 1, height: 13, borderRadius: 99 }} />
                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
              </div>
              <div className="skeleton" style={{ width: '55%', height: 10, borderRadius: 99, marginTop: 10 }} />
            </div>
          ))}
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

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      {showHistoryModal && (
        <HistoryModal
          predictions={scoredPredictions}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  )
}

// ── MatchCard ────────────────────────────────────────────────────────────────

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

// ── History Modal ────────────────────────────────────────────────────────────

type ScoredPred = Prediction & { match: Match }

function HistoryModal({ predictions, onClose }: { predictions: ScoredPred[]; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const cravadas  = predictions.filter((p) => getPredCategory(p.points, true) === 'exact')
  const others    = predictions.filter((p) => getPredCategory(p.points, true) !== 'exact')

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Onde ganhei pontos</span>
          <button className={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={s.modalBody}>
          {cravadas.length > 0 && (
            <div className={s.historySection}>
              <div className={s.historySectionTitle}>
                <Target size={12} /> Cravadas ({cravadas.length})
              </div>
              {cravadas.map((p) => (
                <Link key={p.id} to={`/matches/${p.matchId}`} className={s.historyRow} onClick={onClose}>
                  <div className={s.historyTeams}>{p.match.homeTeam} × {p.match.awayTeam}</div>
                  <div className={s.historyRight}>
                    <span className={s.historyPred}>{p.homeScore}×{p.awayScore}</span>
                    <span className={`${s.historyPts} ${s.historyExact}`}>
                      <Target size={9} /> +{p.points}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {others.length > 0 && (
            <div className={s.historySection}>
              <div className={s.historySectionTitle}>Outros pontos ({others.length})</div>
              {others.map((p) => (
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

// ── Tutorial Modal ───────────────────────────────────────────────────────────

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
          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Pontuação</div>
            <div className={s.tutRows}>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><Target size={20} color="var(--c-accent)" /></span>
                <div className={s.tutInfo}>
                  <strong>CRAVOU! — Placar exato</strong>
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

          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Exemplo — Brasil 2 × 1 Argentina</div>
            <div className={s.tutExamples}>
              <div className={s.tutEx}>
                <span className={s.tutExScore}>2 × 1</span>
                <span className={s.tutExGreen}><Target size={11} /> +10 pts</span>
                <span className={s.tutExLabel}>CRAVOU!</span>
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

          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Eliminatórias — regras especiais</div>
            <div className={s.tutRows}>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><Target size={20} color="var(--c-accent)" /></span>
                <div className={s.tutInfo}>
                  <strong>CRAVOU! — 15 pts</strong>
                  <span>Placar exato. Se empate, precisa acertar também quem passa nos pênaltis.</span>
                </div>
              </div>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><CheckCircle2 size={20} color="#eab308" /></span>
                <div className={s.tutInfo}>
                  <strong>Resultado certo — 8 pts</strong>
                  <span>Acertou a vitória ou o empate (mas não o placar exato). Empate com placar certo porém classificado errado também vale 8 pts.</span>
                </div>
              </div>
              <div className={s.tutRow}>
                <span className={s.tutIcon}><Trophy size={20} color="#f97316" /></span>
                <div className={s.tutInfo}>
                  <strong>Palpite de pênaltis</strong>
                  <span>Ao prever empate em mata-mata, escolha quem passa nos pênaltis. Só conta o resultado em 90 min para a pontuação — os pênaltis determinam o classificado.</span>
                </div>
              </div>
            </div>
          </div>

          <div className={s.tutSection}>
            <div className={s.tutSectionTitle}>Regras de tempo</div>
            <div className={s.tutCard}>
              <div className={s.tutCardRow}><Lock size={14} /><span>Palpites <strong>bloqueiam 30 minutos</strong> antes do início</span></div>
              <div className={s.tutCardRow}><Clock size={14} /><span>Após o bloqueio, não é possível palpitar ou alterar</span></div>
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

          <div className={s.tutFooter}>
            Acerte o placar exato e <strong>CRAVOU!</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
