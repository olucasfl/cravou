import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Lock, Zap, Clock, Target, CheckCircle2, XCircle, Ghost } from 'lucide-react'
import { SoccerBall } from '@/components/icons/SoccerBall'
import { getMatch, upsertPrediction, type Match, type Prediction } from '@/services/cravouService'
import { useSocketEvent } from '@/hooks/useSocketEvent'
import {
  formatMatchDate,
  formatTimeUntil,
  isWithinMinutes,
  minutesElapsed,
  phaseLabel,
  getPredCategory,
  type PredCategory,
} from '@/utils/format'
import { CountryBadge } from '@/components/CountryBadge'
import s from './MatchDetail.module.css'

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>()
  const [match, setMatch] = useState<Match | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 15_000)
    return () => clearInterval(iv)
  }, [])

  const loadMatch = useCallback(() => {
    if (!id) return
    getMatch(id)
      .then(({ match: m, prediction: p }) => {
        setMatch(m)
        setPrediction(p)
        if (p) { setHome(String(p.homeScore)); setAway(String(p.awayScore)) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadMatch() }, [loadMatch])
  useSocketEvent('match:updated', loadMatch)

  async function handleSave() {
    if (!match || !id) return
    const h = parseInt(home), a = parseInt(away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setMsg({ type: 'error', text: 'Informe um placar válido.' })
      return
    }
    setSaving(true); setMsg(null)
    try {
      const saved = await upsertPrediction(id, h, a)
      setPrediction(saved)
      setMsg({ type: 'success', text: 'Palpite salvo!' })
    } catch {
      setMsg({ type: 'error', text: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="app-layout"><div className="page">
      <div className="skeleton" style={{ height: 240, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 200 }} />
    </div></div>
  )
  if (!match) return null

  const isOpen         = match.status === 'upcoming' && !match.predictionsLocked
  const isWaiting      = match.status === 'upcoming' && match.predictionsLocked
  const isLive         = match.status === 'live'
  const isCalculating  = match.status === 'awaiting_result'
  const isFinished     = match.status === 'finished'
  const hasScore       = match.homeScore !== null && match.awayScore !== null

  const closingSoon     = isOpen && isWithinMinutes(match.matchDate, 60)
  const closingVerySoon = isOpen && isWithinMinutes(match.matchDate, 30)

  const elapsed = isLive ? minutesElapsed(match.matchDate) : 0
  const phase = getMatchPhase(elapsed)
  const cat: PredCategory = getPredCategory(prediction?.points, !!prediction)

  return (
    <div className="app-layout">
      <div className="page fade-up">
        <Link to="/matches" className={s.back}><ArrowLeft size={16} /> Jogos</Link>

        {/* ══ HERO ══════════════════════════════════════════════ */}
        <div className={`${s.hero}
          ${isLive        ? s.heroLive        : ''}
          ${isCalculating ? s.heroCalculating : ''}
          ${isFinished && cat === 'exact'   ? s.heroExact   : ''}
          ${isFinished && cat === 'right'   ? s.heroRight   : ''}
          ${isFinished && cat === 'partial' ? s.heroPartial : ''}
          ${isFinished && cat === 'wrong'   ? s.heroWrong   : ''}
        `}>
          {/* Badge de fase */}
          <div className={s.heroBadge}>
            <span className="badge badge-green">
              {match.groupName ? `Grupo ${match.groupName}` : phaseLabel(match.phase)}
            </span>
          </div>

          {/* Times + placar */}
          <div className={s.heroTeams}>
            <div className={s.heroTeam}>
              <CountryBadge country={match.homeTeam} size="lg" />
              <div className={s.heroName}>{match.homeTeam}</div>
            </div>

            <div className={s.heroCenter}>
              {hasScore ? (
                <div className={s.heroScoreBlock}>
                  <span className={s.heroNum}>{match.homeScore}</span>
                  <span className={s.heroDash}>–</span>
                  <span className={s.heroNum}>{match.awayScore}</span>
                </div>
              ) : (
                <div className={s.heroVsBlock}>
                  <span className={s.heroVs}>VS</span>
                  <span className={s.heroKickoff}>{formatMatchDate(match.matchDate)}</span>
                </div>
              )}

              {/* Status inline */}
              {isLive && (
                <div className={s.liveTag}>
                  <span className={s.livePulse} />
                  AO VIVO · {elapsed}'
                </div>
              )}
              {isWaiting && (
                <div className={s.waitingTag}>
                  Começa em {formatTimeUntil(match.matchDate)}
                </div>
              )}
              {isCalculating && (
                <div className={s.calcTag}>
                  <span className={s.calcSpinner} />
                  Calculando...
                </div>
              )}
              {isFinished && hasScore && (
                <div className={`${s.resultTag} ${s[`resultTag_${cat}`]}`}>
                  {CAT_LABEL[cat]}
                </div>
              )}
            </div>

            <div className={s.heroTeam}>
              <CountryBadge country={match.awayTeam} size="lg" />
              <div className={s.heroName}>{match.awayTeam}</div>
            </div>
          </div>

          {match.stadium && (
            <div className={s.heroStadium}><MapPin size={12} /> {match.stadium}</div>
          )}
        </div>

        {/* ══ SEÇÃO POR ESTADO ══════════════════════════════════ */}

        {/* 1. ABERTO — palpites disponíveis */}
        {isOpen && (
          <div className={s.section}>
            {closingVerySoon ? (
              <div className={s.bannerUrgent}>
                <Zap size={14} /> ÚLTIMO MOMENTO! Palpites fecham em {formatTimeUntil(match.matchDate)}
              </div>
            ) : closingSoon ? (
              <div className={s.bannerWarn}>
                <Clock size={14} /> Palpites fecham em {formatTimeUntil(match.matchDate)} — não perca o prazo!
              </div>
            ) : (
              <div className={s.bannerInfo}>
                <Lock size={14} /> Palpites bloqueiam 30min antes do início
              </div>
            )}

            <div className={s.sectionTitle}>
              {prediction ? 'Atualizar palpite' : 'Fazer palpite'}
            </div>

            <div className={s.predInputs}>
              <div className={s.predInputGroup}>
                <div className={s.predTeamLabel}>{match.homeTeam}</div>
                <input className={s.scoreInput} type="number" min={0} max={20}
                  value={home} onChange={(e) => setHome(e.target.value)} placeholder="0" />
              </div>
              <div className={s.predSep}>×</div>
              <div className={s.predInputGroup}>
                <div className={s.predTeamLabel}>{match.awayTeam}</div>
                <input className={s.scoreInput} type="number" min={0} max={20}
                  value={away} onChange={(e) => setAway(e.target.value)} placeholder="0" />
              </div>
            </div>

            <button className={`btn btn-primary ${s.submitBtn}`} onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : prediction ? 'Atualizar palpite' : 'Salvar palpite'}
            </button>

            {msg && <div className={msg.type === 'success' ? s.msgOk : s.msgErr}>{msg.text}</div>}

            {/* Info pontuação */}
            <div className={s.scoringGrid}>
              <div className={s.scoringItem}><span className={s.scoringDot} style={{ background: 'var(--c-green)' }} /><span><b>10 pts</b> placar exato</span></div>
              <div className={s.scoringItem}><span className={s.scoringDot} style={{ background: '#eab308' }} /><span><b>5 pts</b> vencedor certo</span></div>
              <div className={s.scoringItem}><span className={s.scoringDot} style={{ background: '#f97316' }} /><span><b>2 pts</b> gols de um time</span></div>
              <div className={s.scoringItem}><span className={s.scoringDot} style={{ background: 'var(--c-red)' }} /><span><b>0 pts</b> errou tudo</span></div>
            </div>
          </div>
        )}

        {/* 2. ESPERANDO INÍCIO (locked, upcoming) */}
        {isWaiting && (
          <div className={s.section}>
            <div className={s.stateBlock}>
              <div className={s.stateIconWaiting}><Lock size={36} strokeWidth={1.5} /></div>
              <div className={s.stateTitle}>Palpites encerrados</div>
              <div className={s.stateCountdown}>
                Jogo começa em <strong>{formatTimeUntil(match.matchDate)}</strong>
              </div>
              <div className={s.stateSub}>Horário de Brasília · {formatMatchDate(match.matchDate)}</div>
            </div>
            {prediction && <PredBadge prediction={prediction} home={match.homeTeam} away={match.awayTeam} />}
          </div>
        )}

        {/* 3. AO VIVO */}
        {isLive && (
          <div className={s.section}>
            <div className={s.liveBlock}>
              <div className={s.liveBallRow}>
                <span className={s.liveBall}><SoccerBall size={36} color="var(--c-red)" /></span>
                <div className={s.liveTexts}>
                  <div className={s.liveMain}>
                    <span className={s.liveDot} />
                    AO VIVO
                  </div>
                  <div className={s.liveMinute}>{phase.label}</div>
                </div>
              </div>
              <div className={s.liveBar}>
                <div
                  className={`${s.liveBarFill}${phase.pulsing ? ` ${s.liveBarPulsing}` : ''}`}
                  style={{ width: `${phase.barPct}%` }}
                />
              </div>
              <div className={s.liveSub}>
                Resultado disponível após o apito final <Zap size={12} />
              </div>
            </div>
            {prediction && <PredBadge prediction={prediction} home={match.homeTeam} away={match.awayTeam} />}
          </div>
        )}

        {/* 4. CALCULANDO */}
        {isCalculating && (
          <div className={s.section}>
            <div className={s.calcBlock}>
              <div className={s.calcAnimWrap}>
                <div className={s.calcBall}><SoccerBall size={36} color="var(--c-gold)" /></div>
                <div className={s.calcRing} />
              </div>
              <div className={s.calcTitle}>Calculando resultados</div>
              <div className={s.calcSub}>
                O administrador está confirmando o placar.
                Seus pontos aparecerão assim que o resultado for registrado.
              </div>
            </div>
            {prediction && <PredBadge prediction={prediction} home={match.homeTeam} away={match.awayTeam} />}
          </div>
        )}

        {/* 5. FINALIZADO */}
        {isFinished && (
          <div className={s.section}>
            {prediction ? (
              <ResultCard prediction={prediction} match={match} cat={cat} />
            ) : (
              <div className={s.noPredCard}>
                <div className={s.noPredIcon}><Ghost size={36} /></div>
                <div className={s.noPredTitle}>Você não palpitou</div>
                <div className={s.noPredSub}>Não perca o próximo jogo!</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Phase helper ───────────────────────────────────────────────────────────────

function getMatchPhase(elapsed: number): { label: string; barPct: number; pulsing: boolean } {
  if (elapsed < 45) return { label: `1º TEMPO · ${elapsed}'`, barPct: (elapsed / 45) * 50, pulsing: false }
  if (elapsed < 60) return { label: 'INTERVALO', barPct: 50, pulsing: false }
  if (elapsed < 105) return { label: `2º TEMPO · ${elapsed - 15}'`, barPct: 50 + ((elapsed - 60) / 45) * 50, pulsing: false }
  return { label: 'ACRÉSCIMOS · 90\'+', barPct: 100, pulsing: true }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CAT_LABEL: Record<PredCategory, string> = {
  exact:   'Placar exato!',
  right:   'Resultado certo!',
  partial: 'Quase lá!',
  wrong:   'Errou',
  none:    '—',
}

function PredBadge({ prediction, home, away }: { prediction: Prediction; home: string; away: string }) {
  return (
    <div className={s.predBadge}>
      <span className={s.predBadgeLabel}>Seu palpite</span>
      <span className={s.predBadgeScore}>
        {home} <strong>{prediction.homeScore} × {prediction.awayScore}</strong> {away}
      </span>
    </div>
  )
}

function ResultCard({ prediction, match, cat }: { prediction: Prediction; match: Match; cat: PredCategory }) {
  const pts = prediction.points ?? 0
  const catStyles: Record<PredCategory, string> = {
    exact:   s.resultExact,
    right:   s.resultRight,
    partial: s.resultPartial,
    wrong:   s.resultWrong,
    none:    s.resultNone,
  }
  const catIcon = {
    exact:   <Target  size={40} strokeWidth={1.5} color="var(--c-green)" />,
    right:   <CheckCircle2 size={40} strokeWidth={1.5} color="#eab308" />,
    partial: <SoccerBall size={40} color="#f97316" />,
    wrong:   <XCircle size={40} strokeWidth={1.5} color="var(--c-red)" />,
    none:    null,
  } as const
  const catMsg: Record<PredCategory, string> = {
    exact:   'Placar exato! Incrível!',
    right:   'Acertou o resultado!',
    partial: 'Quase lá — gols de um time certos',
    wrong:   'Dessa vez não — mais sorte no próximo!',
    none:    '—',
  }

  return (
    <div className={`${s.resultCard} ${catStyles[cat]}`}>
      <div className={s.resultEmoji}>{catIcon[cat]}</div>
      <div className={s.resultMsg}>{catMsg[cat]}</div>
      <div className={s.resultPts}>+{pts} <span>pontos</span></div>

      <div className={s.resultComparison}>
        <div className={s.resultRow}>
          <span>Seu palpite</span>
          <strong>{prediction.homeScore} × {prediction.awayScore}</strong>
        </div>
        <div className={s.resultRow}>
          <span>Resultado</span>
          <strong>{match.homeScore} × {match.awayScore}</strong>
        </div>
      </div>
    </div>
  )
}
