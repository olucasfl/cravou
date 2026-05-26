import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getMatch, upsertPrediction, type Match, type Prediction } from '@/services/cravouService'
import { formatMatchDate, teamFlag, phaseLabel, statusLabel } from '@/utils/format'
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

  useEffect(() => {
    if (!id) return
    getMatch(id)
      .then(({ match: m, prediction: p }) => {
        setMatch(m)
        setPrediction(p)
        if (p) { setHome(String(p.homeScore)); setAway(String(p.awayScore)) }
      })
      .catch(() => {/* erro silencioso — sem token válido mostra tela vazia */})
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    if (!match || !id) return
    const h = parseInt(home)
    const a = parseInt(away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setMsg({ type: 'error', text: 'Informe um placar válido.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const saved = await upsertPrediction(id, h, a)
      setPrediction(saved)
      setMsg({ type: 'success', text: 'Palpite salvo!' })
    } catch {
      setMsg({ type: 'error', text: 'Erro ao salvar palpite.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="app-layout">
      <div className="page">
        <div className="skeleton" style={{ height: 200, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 160 }} />
      </div>
    </div>
  )

  if (!match) return null

  const locked = match.predictionsLocked || match.status === 'finished'
  const hasScore = match.homeScore !== null && match.awayScore !== null

  return (
    <div className="app-layout">
      <div className="page fade-up">
        <Link to="/matches" className={s.back}>
          <ArrowLeft size={16} /> Jogos
        </Link>

        {/* Hero */}
        <div className={s.hero}>
          <div className={s.heroBadge}>
            <span className="badge badge-green">
              {match.groupName ? `Grupo ${match.groupName}` : phaseLabel(match.phase)}
            </span>
          </div>

          <div className={s.heroTeams}>
            <div className={s.heroTeam}>
              <div className={s.heroFlag}>{teamFlag(match.homeTeam)}</div>
              <div className={s.heroName}>{match.homeTeam}</div>
            </div>

            <div className={s.heroScore}>
              {hasScore ? (
                <>
                  <span className={s.heroScoreNum}>{match.homeScore}</span>
                  <span className={s.heroScoreSep}>-</span>
                  <span className={s.heroScoreNum}>{match.awayScore}</span>
                </>
              ) : (
                <span className={s.heroVs}>VS</span>
              )}
            </div>

            <div className={s.heroTeam}>
              <div className={s.heroFlag}>{teamFlag(match.awayTeam)}</div>
              <div className={s.heroName}>{match.awayTeam}</div>
            </div>
          </div>

          <div className={s.heroMeta}>
            <span>{formatMatchDate(match.matchDate)}</span>
            {match.stadium && <><span className={s.heroDot}>·</span><span>{match.stadium}</span></>}
            <span className={s.heroDot}>·</span>
            <span className={`badge ${match.status === 'live' ? 'badge-red' : 'badge-muted'}`}>
              {statusLabel(match.status)}
            </span>
          </div>
        </div>

        {/* Palpite */}
        <div className={s.section}>
          <div className={s.sectionTitle}>
            {prediction ? 'Seu palpite' : 'Fazer palpite'}
          </div>

          {match.status === 'finished' && prediction?.points !== null ? (
            <div className={s.pointsResult}>
              <div className={s.pointsResultValue}>+{prediction!.points}</div>
              <div className={s.pointsResultLabel}>pontos conquistados</div>
            </div>
          ) : (
            <>
              <div className={s.predInputs}>
                <div>
                  <div className={s.predTeamLabel}>{match.homeTeam}</div>
                  <input
                    className={s.scoreInput}
                    type="number"
                    min={0}
                    max={20}
                    value={home}
                    onChange={(e) => setHome(e.target.value)}
                    disabled={locked}
                    placeholder="0"
                  />
                </div>
                <div className={s.predSep}>-</div>
                <div>
                  <div className={s.predTeamLabel}>{match.awayTeam}</div>
                  <input
                    className={s.scoreInput}
                    type="number"
                    min={0}
                    max={20}
                    value={away}
                    onChange={(e) => setAway(e.target.value)}
                    disabled={locked}
                    placeholder="0"
                  />
                </div>
              </div>

              {locked ? (
                <div className={s.lockedMsg}>
                  🔒 Palpites encerrados para este jogo
                </div>
              ) : (
                <button
                  className={`btn btn-primary ${s.submitBtn}`}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : prediction ? 'Atualizar palpite' : 'Salvar palpite'}
                </button>
              )}

              {msg && (
                <div className={msg.type === 'success' ? s.successMsg : s.errorMsg}>
                  {msg.text}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
