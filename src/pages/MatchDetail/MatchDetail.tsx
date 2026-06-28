import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Lock, Zap, Clock, Target, CheckCircle2, XCircle, Ghost, Trophy, Minus } from 'lucide-react'
import { SoccerBall } from '@/components/icons/SoccerBall'
import { CountryBadge } from '@/components/CountryBadge'
import { getMatch, upsertPrediction, type Match, type Prediction } from '@/services/cravouService'
import { useSocketEvent } from '@/hooks/useSocketEvent'
import { useAppData } from '@/context/AppDataContext'
import {
  formatMatchDate,
  formatTimeUntil,
  formatTimeUntilClose,
  isWithinMinutes,
  minutesElapsed,
  phaseLabel,
  getPredCategory,
  getPredBreakdown,
  type PredCategory,
} from '@/utils/format'
import CravouCelebration from '@/components/CravouCelebration/CravouCelebration'
import s from './MatchDetail.module.css'

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>()
  const { refresh } = useAppData()
  const [match, setMatch] = useState<Match | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [penaltyWinner, setPenaltyWinner] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [, setTick] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  const celebratedRef = useRef(false)

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
        if (p) {
          setHome(String(p.homeScore))
          setAway(String(p.awayScore))
          setPenaltyWinner(p.penaltyWinner ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadMatch() }, [loadMatch])
  useSocketEvent('match:updated', loadMatch)

  useEffect(() => {
    if (!match || !prediction) return
    if (match.status !== 'finished') return
    const category = getPredCategory(prediction.points, true, match.phase)
    if ((category === 'exact' || category === 'exact_bonus' || category === 'exact_penalty') && !celebratedRef.current) {
      celebratedRef.current = true
      const t = setTimeout(() => setShowCelebration(true), 900)
      return () => clearTimeout(t)
    }
  }, [match, prediction])

  async function handleSave() {
    if (!match || !id) return
    const h = parseInt(home), a = parseInt(away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setMsg({ type: 'error', text: 'Informe um placar válido.' })
      return
    }
    const isKnockout = match.phase !== 'group_stage'
    const isTie = h === a
    const pw = isKnockout && isTie && penaltyWinner ? penaltyWinner : undefined
    setSaving(true); setMsg(null)
    try {
      const saved = await upsertPrediction(id, h, a, pw)
      setPrediction(saved)
      setMsg({ type: 'success', text: 'Palpite salvo!' })
      refresh() // atualiza HOME com o novo palpite em background
    } catch {
      setMsg({ type: 'error', text: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="app-layout"><div className="page fade-up">
      {/* Back link */}
      <div className="skeleton" style={{ width: 70, height: 14, borderRadius: 99, marginBottom: 20 }} />
      {/* Hero card */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 20, padding: '24px 20px 20px', marginBottom: 14 }}>
        <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 99, margin: '0 auto 24px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
            <div className="skeleton" style={{ width: 56, height: 56, borderRadius: '50%' }} />
            <div className="skeleton" style={{ width: 80, height: 13, borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div className="skeleton" style={{ width: 64, height: 36, borderRadius: 10 }} />
            <div className="skeleton" style={{ width: 90, height: 12, borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
            <div className="skeleton" style={{ width: 56, height: 56, borderRadius: '50%' }} />
            <div className="skeleton" style={{ width: 80, height: 13, borderRadius: 99 }} />
          </div>
        </div>
        <div className="skeleton" style={{ width: 130, height: 12, borderRadius: 99, margin: '16px auto 0' }} />
      </div>
      {/* Prediction section */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: 20 }}>
        <div className="skeleton" style={{ width: '100%', height: 14, borderRadius: 99, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '80%', height: 14, borderRadius: 99, marginBottom: 20 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
          <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 12 }} />
        </div>
        <div className="skeleton" style={{ width: '100%', height: 48, borderRadius: 12 }} />
      </div>
    </div></div>
  )
  if (!match) return null

  const isOpen         = match.status === 'upcoming' && !match.predictionsLocked
  const isWaiting      = match.status === 'upcoming' && match.predictionsLocked
  const isLive         = match.status === 'live'
  const isCalculating  = match.status === 'awaiting_result'
  const isFinished     = match.status === 'finished'
  const hasScore       = match.homeScore !== null && match.awayScore !== null
  const isKnockout     = match.phase !== 'group_stage'
  const predH = parseInt(home), predA = parseInt(away)
  const isTiePred = !isNaN(predH) && !isNaN(predA) && predH === predA

  const closeAt = new Date(match.matchDate).getTime() - 10 * 60_000
  const closeAlreadyPassed = isOpen && closeAt <= Date.now()
  // closingSoon: entre 10min e 60min antes do jogo (janela de aviso)
  const closingSoon = isOpen && !closeAlreadyPassed && isWithinMinutes(match.matchDate, 60)

  const elapsed = isLive ? minutesElapsed(match.matchDate) : 0
  const phase = getMatchPhase(elapsed)
  const cat: PredCategory = getPredCategory(prediction?.points, !!prediction, match.phase)

  return (
    <div className="app-layout">
      <div className="page fade-up">
        <Link to="/matches" className={s.back}><ArrowLeft size={16} /> Jogos</Link>

        {/* ══ HERO ══════════════════════════════════════════════ */}
        <div className={`${s.hero}
          ${isLive        ? s.heroLive        : ''}
          ${isCalculating ? s.heroCalculating : ''}
          ${isFinished && (cat === 'exact' || cat === 'exact_bonus' || cat === 'exact_penalty') ? s.heroExact   : ''}
          ${isFinished && (cat === 'right' || cat === 'bonus' || cat === 'bonus_penalty')    ? s.heroRight   : ''}
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
                  AO VIVO · {gameMinute(elapsed)}
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
                <div className={`${s.resultTag} ${s[`resultTag_${
                  cat === 'exact_bonus' || cat === 'exact_penalty' ? 'exact' :
                  cat === 'bonus_penalty' ? 'right' : cat
                }`]}`}>
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
            {closeAlreadyPassed ? (
              <div className={s.bannerWarn}>
                <Lock size={14} /> Palpites encerrados — jogo começa em breve
              </div>
            ) : closingSoon ? (
              <div className={s.bannerWarn}>
                <Clock size={14} /> Palpites fecham em {formatTimeUntilClose(match.matchDate)} — não perca o prazo!
              </div>
            ) : (
              <div className={s.bannerInfo}>
                <Lock size={14} /> Palpites bloqueiam 10min antes do início
              </div>
            )}

            {isKnockout && (
              <div className={s.knockoutNote}>
                <Trophy size={13} /> Eliminatória — pontuação conta apenas o resultado em 90 min
              </div>
            )}

            <div className={s.sectionTitle}>
              {prediction ? 'Atualizar palpite' : 'Fazer palpite'}
            </div>

            <div className={s.predInputs}>
              <div className={s.predInputGroup}>
                <div className={s.predTeamLabel}>{match.homeTeam}</div>
                <input className={s.scoreInput} type="number" min={0} max={20}
                  value={home} onChange={(e) => { setHome(e.target.value); if (parseInt(e.target.value) !== predA) setPenaltyWinner('') }} placeholder="0" />
              </div>
              <div className={s.predSep}>×</div>
              <div className={s.predInputGroup}>
                <div className={s.predTeamLabel}>{match.awayTeam}</div>
                <input className={s.scoreInput} type="number" min={0} max={20}
                  value={away} onChange={(e) => { setAway(e.target.value); if (parseInt(e.target.value) !== predH) setPenaltyWinner('') }} placeholder="0" />
              </div>
            </div>

            {/* Selector de classificado — só aparece em mata-mata com empate previsto */}
            {isKnockout && isTiePred && (
              <div className={s.penaltyPickWrap}>
                <div className={s.penaltyPickLabel}>
                  <Zap size={12} /> Empate — quem você acha que se classifica?
                </div>
                <div className={s.penaltyBtns}>
                  <button
                    type="button"
                    className={`${s.penaltyBtn} ${penaltyWinner === match.homeTeam ? s.penaltyBtnActive : ''}`}
                    onClick={() => setPenaltyWinner(penaltyWinner === match.homeTeam ? '' : match.homeTeam)}
                  >
                    <CountryBadge country={match.homeTeam} size="xs" />
                    {match.homeTeam}
                  </button>
                  <button
                    type="button"
                    className={`${s.penaltyBtn} ${penaltyWinner === match.awayTeam ? s.penaltyBtnActive : ''}`}
                    onClick={() => setPenaltyWinner(penaltyWinner === match.awayTeam ? '' : match.awayTeam)}
                  >
                    <CountryBadge country={match.awayTeam} size="xs" />
                    {match.awayTeam}
                  </button>
                </div>
              </div>
            )}

            <button className={`btn btn-primary ${s.submitBtn}`} onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : prediction ? 'Atualizar palpite' : 'Salvar palpite'}
            </button>

            {msg && <div className={msg.type === 'success' ? s.msgOk : s.msgErr}>{msg.text}</div>}

            {/* Info pontuação */}
            {isKnockout ? (
              <div className={s.scoringGrid}>

                {/* CRAVOU */}
                <div className={s.scoringGroup}>
                  <div className={s.scoringGroupLabel}>
                    <span className={s.scoringDot} style={{ background: 'var(--c-green)' }} />
                    Cravou
                    <span className={s.scoringGroupBase}>— 15 pts base</span>
                  </div>
                  <div className={s.scoringSubList}>
                    <div className={s.scoringSubRow}>
                      <span>Placar exato de vitória</span>
                      <span className={s.scoringPts}>15 pts</span>
                    </div>
                    <div className={s.scoringSubRow}>
                      <span>Empate exato <span className={s.scoringBonus}>+ acertou classificado</span></span>
                      <span className={s.scoringPts}>15 pts <span className={s.scoringBonus}>+2</span></span>
                    </div>
                    <div className={s.scoringSubRow}>
                      <span>Empate exato <span className={s.scoringPenalty}>+ errou classificado</span></span>
                      <span className={s.scoringPts}>15 pts <span className={s.scoringPenalty}>−1</span></span>
                    </div>
                  </div>
                </div>

                {/* ACERTOU RESULTADO */}
                <div className={s.scoringGroup}>
                  <div className={s.scoringGroupLabel}>
                    <span className={s.scoringDot} style={{ background: '#eab308' }} />
                    Acertou Resultado
                    <span className={s.scoringGroupBase}>— 8 pts base</span>
                  </div>
                  <div className={s.scoringSubList}>
                    <div className={s.scoringSubRow}>
                      <span>Vitória + gols de um time</span>
                      <span className={s.scoringPts}>8 pts <span className={s.scoringBonus}>+2</span></span>
                    </div>
                    <div className={s.scoringSubRow}>
                      <span>Vitória (sem bônus)</span>
                      <span className={s.scoringPts}>8 pts</span>
                    </div>
                    <div className={s.scoringSubRow}>
                      <span>Empate certo <span className={s.scoringBonus}>+ acertou classificado</span></span>
                      <span className={s.scoringPts}>8 pts <span className={s.scoringBonus}>+2</span></span>
                    </div>
                    <div className={s.scoringSubRow}>
                      <span>Empate certo <span className={s.scoringPenalty}>+ errou classificado</span></span>
                      <span className={s.scoringPts}>8 pts <span className={s.scoringPenalty}>−1</span></span>
                    </div>
                  </div>
                </div>

                {/* SIMPLES */}
                <div className={s.scoringItem}>
                  <span className={s.scoringDot} style={{ background: '#f97316' }} />
                  <span>Gols de um time certos (errou resultado)</span>
                  <span className={s.scoringPts} style={{ marginLeft: 'auto' }}>3 pts</span>
                </div>
                <div className={s.scoringItem}>
                  <span className={s.scoringDot} style={{ background: 'var(--c-red)' }} />
                  <span>Errou tudo</span>
                  <span className={s.scoringPts} style={{ marginLeft: 'auto' }}>0 pts</span>
                </div>

              </div>
            ) : (
              <div className={s.scoringGrid}>
                <div className={s.scoringItem}><span className={s.scoringDot} style={{ background: 'var(--c-green)' }} /><span><b>10 pts</b> placar exato</span></div>
                <div className={s.scoringItem}><span className={s.scoringDot} style={{ background: '#eab308' }} /><span><b>5 pts</b> resultado certo <span className={s.scoringBonus}>+2 gols de um time · +1 empate</span></span></div>
                <div className={s.scoringItem}><span className={s.scoringDot} style={{ background: '#f97316' }} /><span><b>2 pts</b> gols de um time (errou resultado)</span></div>
                <div className={s.scoringItem}><span className={s.scoringDot} style={{ background: 'var(--c-red)' }} /><span><b>0 pts</b> errou tudo</span></div>
              </div>
            )}
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

      <CravouCelebration
        show={showCelebration}
        points={prediction?.points ?? 0}
        onDismiss={() => setShowCelebration(false)}
      />
    </div>
  )
}

// ── Phase helper ───────────────────────────────────────────────────────────────

function gameMinute(elapsed: number): string {
  if (elapsed < 45)  return `${elapsed}'`
  if (elapsed < 60)  return `45'`
  if (elapsed < 105) return `${elapsed - 15}'`
  return `90'+`
}

function getMatchPhase(elapsed: number): { label: string; barPct: number; pulsing: boolean } {
  if (elapsed < 45) return { label: `1º TEMPO · ${elapsed}'`, barPct: (elapsed / 45) * 50, pulsing: false }
  if (elapsed < 60) return { label: 'INTERVALO', barPct: 50, pulsing: false }
  if (elapsed < 105) return { label: `2º TEMPO · ${elapsed - 15}'`, barPct: 50 + ((elapsed - 60) / 45) * 50, pulsing: false }
  return { label: 'ACRÉSCIMOS · 90\'+', barPct: 100, pulsing: true }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CAT_LABEL: Record<PredCategory, string> = {
  exact:          'Placar exato!',
  exact_bonus:    'Cravou + bônus!',
  exact_penalty:  'Cravou!',
  bonus:          'Resultado + bônus!',
  bonus_penalty:  'Resultado certo',
  right:          'Resultado certo!',
  partial:        'Quase lá!',
  wrong:          'Errou',
  none:           '—',
}

function PredBadge({ prediction, home, away }: { prediction: Prediction; home: string; away: string }) {
  return (
    <div className={s.predBadge}>
      <span className={s.predBadgeLabel}>Seu palpite</span>
      <span className={s.predBadgeScore}>
        {home} <strong>{prediction.homeScore} × {prediction.awayScore}</strong> {away}
      </span>
      {prediction.penaltyWinner && (
        <span className={s.predBadgePenalty}>
          <Trophy size={11} /> Classif.: {prediction.penaltyWinner}
        </span>
      )}
    </div>
  )
}

function ResultCard({ prediction, match, cat }: { prediction: Prediction; match: Match; cat: PredCategory }) {
  const pts = prediction.points ?? 0
  const isKnockout = match.phase !== 'group_stage'

  const CATS_WITH_BREAKDOWN: PredCategory[] = ['right', 'bonus', 'exact_bonus', 'exact_penalty', 'bonus_penalty']
  const bd = CATS_WITH_BREAKDOWN.includes(cat) && pts > 0
    ? getPredBreakdown(pts, match.phase)
    : null
  const hasModifier = bd !== null && bd.modifier !== 0

  // Pill do classificado — aparece sempre que há penaltyWinner no palpite (knockout draw)
  const showClassifiedPill = isKnockout && !!prediction.penaltyWinner && cat !== 'wrong' && cat !== 'partial' && cat !== 'none'
  const classifiedModifier = bd?.modifier ?? 0

  const catStyles: Record<PredCategory, string> = {
    exact:          s.resultExact,
    exact_bonus:    s.resultExact,
    exact_penalty:  s.resultExact,
    bonus:          s.resultBonus,
    bonus_penalty:  s.resultRight,
    right:          s.resultRight,
    partial:        s.resultPartial,
    wrong:          s.resultWrong,
    none:           s.resultNone,
  }

  const iconColor = '#eab308'
  const catIcon: Record<PredCategory, React.ReactNode> = {
    exact:          <Target size={40} strokeWidth={1.5} color="var(--c-green)" />,
    exact_bonus:    <Target size={40} strokeWidth={1.5} color="var(--c-green)" />,
    exact_penalty:  <Target size={40} strokeWidth={1.5} color="var(--c-green)" />,
    bonus:          bd?.drawBonus
      ? <Minus size={40} strokeWidth={2} color={iconColor} />
      : <Zap   size={40} strokeWidth={1.5} color={iconColor} />,
    bonus_penalty:  <Minus size={40} strokeWidth={2} color={iconColor} />,
    right:          <CheckCircle2 size={40} strokeWidth={1.5} color={iconColor} />,
    partial:        <SoccerBall size={40} color="#f97316" />,
    wrong:          <XCircle size={40} strokeWidth={1.5} color="var(--c-red)" />,
    none:           null,
  }

  let resultMsg = ''
  if (cat === 'exact' || cat === 'exact_bonus' || cat === 'exact_penalty') {
    resultMsg = isKnockout && match.homeScore === match.awayScore
      ? 'CRAVOU! Empate exato'
      : 'CRAVOU! Placar exato!'
  } else if (cat === 'bonus' && prediction.penaltyWinner) {
    resultMsg = 'Acertou empate + classificado!'
  } else if (cat === 'bonus' && bd?.drawBonus) {
    resultMsg = 'Empate acertado + gols de um time!'
  } else if (cat === 'bonus') {
    resultMsg = 'Resultado certo e gols de um time!'
  } else if (cat === 'bonus_penalty') {
    resultMsg = 'Acertou empate, errou o classificado'
  } else if (cat === 'right') {
    resultMsg = 'Acertou o resultado!'
  } else if (cat === 'partial') {
    resultMsg = 'Quase lá — gols de um time certos'
  } else {
    resultMsg = 'Dessa vez não — mais sorte no próximo!'
  }

  return (
    <div className={`${s.resultCard} ${catStyles[cat]}`}>
      <div className={s.resultEmoji}>{catIcon[cat]}</div>
      <div className={s.resultMsg}>{resultMsg}</div>

      {showClassifiedPill && (
        <div className={classifiedModifier >= 0 ? s.classifiedPillBonus : s.classifiedPillPenalty}>
          <Trophy size={11} />
          CLASSIFICADO {prediction.penaltyWinner}
          <span className={s.classifiedPillMod}>
            {classifiedModifier > 0 ? `(+${classifiedModifier} pts)` : classifiedModifier < 0 ? `(${classifiedModifier} pt)` : ''}
          </span>
        </div>
      )}

      {hasModifier ? (
        <div className={s.resultPtsSplit}>
          <span className={s.resultPtsSplitBase}>+{bd!.base}</span>
          <span className={bd!.modifier < 0 ? s.resultPtsSplitPenalty : s.resultPtsSplitBonus}>
            {bd!.drawBonus && <Minus size={26} strokeWidth={2.5} />}
            {bd!.modifier > 0 ? `+${bd!.modifier}` : String(bd!.modifier)}
          </span>
          <span className={s.resultPtsSplitLabel}>pontos</span>
        </div>
      ) : (
        <div className={s.resultPts}>+{pts} <span>pontos</span></div>
      )}

      <div className={s.resultComparison}>
        <div className={s.resultRow}>
          <span>Seu palpite</span>
          <strong>{prediction.homeScore} × {prediction.awayScore}</strong>
          {prediction.penaltyWinner && (
            <span className={s.resultPenalty}><Trophy size={10} /> {prediction.penaltyWinner}</span>
          )}
        </div>
        <div className={s.resultRow}>
          <span>Resultado</span>
          <strong>{match.homeScore} × {match.awayScore}</strong>
          {match.penaltyWinner && (
            <span className={s.resultPenalty}><Trophy size={10} /> {match.penaltyWinner}</span>
          )}
        </div>
      </div>
    </div>
  )
}

