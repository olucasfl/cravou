import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw, Lock, Check, Trophy, Flag, Calendar, Building2 } from 'lucide-react'
import {
  adminGetMatches,
  adminUpdateScore,
  adminUpdateStatus,
  adminLockMatch,
  adminReprocessMatch,
  adminFinalizeMatch,
  adminUpdateDate,
  adminMountR32,
  adminSetKnockoutResult,
  getBracket,
  type Match,
  type BracketSlot,
} from '@/services/cravouService'
import { formatMatchDate, phaseLabel, statusLabel } from '@/utils/format'
import s from './Admin.module.css'

type Tab = 'matches' | 'bracket'
type PhaseFilter = 'all' | 'group_stage' | 'knockout'
type StatusFilter = 'all' | 'upcoming' | 'live' | 'awaiting_result' | 'finished' | 'locked'

interface Msg { id: string; type: 'ok' | 'err'; text: string }

const ROUND_ORDER = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final']
const ROUND_LABELS: Record<string, string> = {
  round_of_32: 'Round of 32',
  round_of_16: 'Oitavas de Final',
  quarterfinal: 'Quartas de Final',
  semifinal: 'Semifinal',
  third_place: '3º Lugar',
  final: 'Final',
}

// Converte Date para valor de <input type="datetime-local"> (local browser time)
function toDatetimeLocal(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>('matches')
  const [matches, setMatches] = useState<Match[]>([])
  const [bracket, setBracket] = useState<BracketSlot[]>([])
  const [loading, setLoading] = useState(true)

  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [editId, setEditId] = useState<string | null>(null)
  const [editHome, setEditHome] = useState('')
  const [editAway, setEditAway] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [savingDate, setSavingDate] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)

  const [winnerInputs, setWinnerInputs] = useState<Record<string, string>>({})
  const [bracketMsg, setBracketMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [mounting, setMounting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [m, b] = await Promise.all([
      adminGetMatches().catch(() => []),
      getBracket().catch(() => []),
    ])
    setMatches(m)
    setBracket(b)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return matches
      .filter((m) => {
        if (phaseFilter === 'group_stage') return m.phase === 'group_stage'
        if (phaseFilter === 'knockout') return m.phase !== 'group_stage'
        return true
      })
      .filter((m) => statusFilter === 'all' || m.status === statusFilter)
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
  }, [matches, phaseFilter, statusFilter])

  function openEdit(m: Match) {
    setEditId(m.id)
    setEditHome(m.homeScore !== null ? String(m.homeScore) : '')
    setEditAway(m.awayScore !== null ? String(m.awayScore) : '')
    setEditStatus(m.status)
    setEditDate(toDatetimeLocal(m.matchDate))
    setMsg(null)
  }

  // Salvar apenas status (sem score)
  async function saveStatus(m: Match) {
    if (editStatus === m.status) {
      setMsg({ id: m.id, type: 'ok', text: 'Nenhuma alteração.' })
      setEditId(null)
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      await adminUpdateStatus(m.id, editStatus)
      setMsg({ id: m.id, type: 'ok', text: 'Status atualizado!' })
      setEditId(null)
      await load()
    } catch {
      setMsg({ id: m.id, type: 'err', text: 'Erro ao atualizar status.' })
    } finally {
      setSaving(false)
    }
  }

  // Salvar apenas placar (sem finalizar)
  async function saveScore(m: Match) {
    const h = parseInt(editHome)
    const a = parseInt(editAway)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setMsg({ id: m.id, type: 'err', text: 'Placar inválido.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      await adminUpdateScore(m.id, h, a)
      setMsg({ id: m.id, type: 'ok', text: 'Placar salvo!' })
      await load()
    } catch {
      setMsg({ id: m.id, type: 'err', text: 'Erro ao salvar placar.' })
    } finally {
      setSaving(false)
    }
  }

  // REGISTRAR RESULTADO: define placar + finaliza + calcula pontos em um passo
  async function finalizeMatch(m: Match) {
    const h = parseInt(editHome)
    const a = parseInt(editAway)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setMsg({ id: m.id, type: 'err', text: 'Informe um placar válido antes de finalizar.' })
      return
    }
    setFinalizing(true)
    setMsg(null)
    try {
      await adminFinalizeMatch(m.id, h, a)
      setMsg({ id: m.id, type: 'ok', text: `Resultado registrado! ${h}×${a} — pontos calculados.` })
      setEditId(null)
      await load()
    } catch {
      setMsg({ id: m.id, type: 'err', text: 'Erro ao finalizar partida.' })
    } finally {
      setFinalizing(false)
    }
  }

  // Alterar data/hora da partida
  async function saveDate(m: Match) {
    if (!editDate) {
      setMsg({ id: m.id, type: 'err', text: 'Informe uma data válida.' })
      return
    }
    setSavingDate(true)
    setMsg(null)
    try {
      // datetime-local está no timezone do browser; converte para ISO UTC
      const isoDate = new Date(editDate).toISOString()
      await adminUpdateDate(m.id, isoDate)
      setMsg({ id: m.id, type: 'ok', text: 'Data atualizada! O cron job ajustará o status em até 1 minuto.' })
      await load()
    } catch {
      setMsg({ id: m.id, type: 'err', text: 'Erro ao atualizar data.' })
    } finally {
      setSavingDate(false)
    }
  }

  async function reprocess(id: string) {
    setMsg(null)
    try {
      await adminReprocessMatch(id)
      setMsg({ id, type: 'ok', text: 'Pontuações reprocessadas!' })
    } catch {
      setMsg({ id, type: 'err', text: 'Erro ao reprocessar.' })
    }
  }

  async function lockMatch(id: string) {
    setMsg(null)
    try {
      await adminLockMatch(id)
      setMsg({ id, type: 'ok', text: 'Palpites bloqueados!' })
      await load()
    } catch {
      setMsg({ id, type: 'err', text: 'Erro ao bloquear.' })
    }
  }

  async function mountR32() {
    if (!confirm('Montar chaveamento Round of 32? Os grupos precisam estar finalizados.')) return
    setMounting(true)
    setBracketMsg(null)
    try {
      await adminMountR32()
      setBracketMsg({ type: 'ok', text: 'R32 montado com sucesso!' })
      await load()
    } catch {
      setBracketMsg({ type: 'err', text: 'Erro ao montar R32. Verifique se os grupos estão classificados.' })
    } finally {
      setMounting(false)
    }
  }

  async function setWinner(slotId: string) {
    const winner = winnerInputs[slotId]?.trim()
    if (!winner) return
    setBracketMsg(null)
    try {
      await adminSetKnockoutResult(slotId, winner)
      setBracketMsg({ type: 'ok', text: `Vencedor definido: ${winner}` })
      setWinnerInputs((prev) => ({ ...prev, [slotId]: '' }))
      await load()
    } catch {
      setBracketMsg({ type: 'err', text: 'Erro ao definir vencedor.' })
    }
  }

  const bracketByRound = useMemo(() => {
    const rounds: Record<string, BracketSlot[]> = {}
    for (const slot of bracket) {
      if (!rounds[slot.round]) rounds[slot.round] = []
      rounds[slot.round].push(slot)
    }
    return rounds
  }, [bracket])

  return (
    <div className="app-layout">
      <div className="page fade-up">

        {/* Header */}
        <div className={s.header}>
          <Link to="/profile" className={s.back}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className={s.title}>Painel Admin</div>
            <div className={s.subtitle}>{matches.length} partidas · {bracket.length} slots</div>
          </div>
        </div>

        {/* Tabs */}
        <div className={s.tabs}>
          <button className={`${s.tab} ${tab === 'matches' ? s.tabActive : ''}`} onClick={() => setTab('matches')}>
            Partidas
          </button>
          <button className={`${s.tab} ${tab === 'bracket' ? s.tabActive : ''}`} onClick={() => setTab('bracket')}>
            Chaveamento
          </button>
        </div>

        {loading && (
          <div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 100, marginBottom: 10 }} />
            ))}
          </div>
        )}

        {/* ═══ PARTIDAS ═══ */}
        {!loading && tab === 'matches' && (
          <>
            <div className={s.filters}>
              <div className={s.filterRow}>
                {(['all', 'group_stage', 'knockout'] as PhaseFilter[]).map((f) => (
                  <button
                    key={f}
                    className={`${s.pill} ${phaseFilter === f ? s.pillActive : ''}`}
                    onClick={() => setPhaseFilter(f)}
                  >
                    {f === 'all' ? 'Todos' : f === 'group_stage' ? 'Grupos' : 'Mata-mata'}
                  </button>
                ))}
              </div>
              <div className={s.filterRow}>
                {(['all', 'upcoming', 'live', 'awaiting_result', 'finished', 'locked'] as StatusFilter[]).map((f) => (
                  <button
                    key={f}
                    className={`${s.pill} ${statusFilter === f ? s.pillActive : ''}`}
                    onClick={() => setStatusFilter(f)}
                  >
                    {f === 'all' ? 'Todos' : statusLabel(f)}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.matchCount}>{filtered.length} partidas</div>

            <div className={s.matchList}>
              {filtered.map((m) => (
                <div key={m.id} className={s.matchCard}>
                  {/* Match header */}
                  <div className={s.matchTop}>
                    <div className={s.matchMeta}>
                      <span className={s.matchGroup}>
                        {m.groupName ? `Grupo ${m.groupName}` : phaseLabel(m.phase)}
                        {m.groupRound ? ` · Rod.${m.groupRound}` : ''}
                      </span>
                      <span className={s.matchDate}>{formatMatchDate(m.matchDate)}</span>
                    </div>
                    <div className={s.matchBadges}>
                      <span className={`badge ${
                        m.status === 'live' ? 'badge-red' :
                        m.status === 'finished' ? 'badge-green' : 'badge-muted'
                      }`}>
                        {statusLabel(m.status)}
                      </span>
                      {m.predictionsLocked && (
                        <span className={s.lockedBadge}><Lock size={10} /></span>
                      )}
                    </div>
                  </div>

                  {/* Teams + score */}
                  <div className={s.matchTeams}>
                    <span className={s.teamName}>{m.homeTeam}</span>
                    <span className={s.score}>
                      {m.homeScore !== null && m.awayScore !== null
                        ? `${m.homeScore} — ${m.awayScore}`
                        : 'vs'}
                    </span>
                    <span className={s.teamName}>{m.awayTeam}</span>
                  </div>

                  {/* Painel de edição */}
                  {editId === m.id ? (
                    <div className={s.editPanel}>

                      {/* ── Seção: Resultado ── */}
                      <div className={s.editSection}>
                        <div className={s.editSectionLabel}>Resultado</div>
                        <div className={s.editScoreRow}>
                          <div className={s.editScoreGroup}>
                            <span className={s.editTeamLabel}>{m.homeTeam}</span>
                            <input
                              className={s.scoreInput}
                              type="number" min={0} max={30} placeholder="0"
                              value={editHome}
                              onChange={(e) => setEditHome(e.target.value)}
                            />
                          </div>
                          <span className={s.editSep}>×</span>
                          <div className={s.editScoreGroup}>
                            <span className={s.editTeamLabel}>{m.awayTeam}</span>
                            <input
                              className={s.scoreInput}
                              type="number" min={0} max={30} placeholder="0"
                              value={editAway}
                              onChange={(e) => setEditAway(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Botão principal: registrar resultado final */}
                        {m.status !== 'finished' && (
                          <button
                            className={`${s.actionBtn} ${s.finalizeBtn}`}
                            onClick={() => finalizeMatch(m)}
                            disabled={finalizing}
                          >
                            <Flag size={14} />
                            {finalizing ? 'Finalizando...' : 'Registrar Resultado Final'}
                          </button>
                        )}

                        <div className={s.editActions}>
                          <button
                            className={`${s.actionBtn} ${s.saveBtn}`}
                            onClick={() => saveScore(m)}
                            disabled={saving}
                          >
                            <Save size={13} /> {saving ? 'Salvando...' : 'Só placar'}
                          </button>
                          <button
                            className={`${s.actionBtn} ${s.reprocessBtn}`}
                            onClick={() => reprocess(m.id)}
                            disabled={m.status !== 'finished'}
                            title={m.status !== 'finished' ? 'Só disponível em partidas finalizadas' : ''}
                          >
                            <RefreshCw size={13} /> Recalcular pts
                          </button>
                        </div>
                      </div>

                      {/* ── Seção: Status manual ── */}
                      <div className={s.editSection}>
                        <div className={s.editSectionLabel}>Status manual</div>
                        <div className={s.editActions}>
                          <select
                            className={s.statusSelect}
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                          >
                            <option value="upcoming">Agendado</option>
                            <option value="locked">Bloqueado</option>
                            <option value="live">Ao vivo</option>
                            <option value="awaiting_result">Aguardando resultado</option>
                            <option value="finished">Encerrado</option>
                          </select>
                          <button
                            className={`${s.actionBtn} ${s.saveBtn}`}
                            onClick={() => saveStatus(m)}
                            disabled={saving}
                          >
                            <Save size={13} /> Salvar status
                          </button>
                        </div>
                      </div>

                      {/* ── Seção: Data/hora (para testes) ── */}
                      <div className={s.editSection}>
                        <div className={s.editSectionLabel}>
                          <Calendar size={13} /> Data / hora (para testes)
                        </div>
                        <div className={s.editDateRow}>
                          <input
                            className={s.dateInput}
                            type="datetime-local"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                          <button
                            className={`${s.actionBtn} ${s.saveBtn}`}
                            onClick={() => saveDate(m)}
                            disabled={savingDate}
                          >
                            {savingDate ? 'Salvando...' : 'Alterar data'}
                          </button>
                        </div>
                        <div className={s.dateHint}>
                          Mude para daqui a 1 min → bloqueia palpites em segundos via cron job.
                          O cron roda a cada minuto.
                        </div>
                      </div>

                      <button className={s.cancelBtn} onClick={() => setEditId(null)}>
                        Fechar painel
                      </button>

                      {msg?.id === m.id && (
                        <div className={msg.type === 'ok' ? s.msgOk : s.msgErr}>{msg.text}</div>
                      )}
                    </div>
                  ) : (
                    <div className={s.matchActions}>
                      <button className={`${s.actionBtn} ${s.editBtn}`} onClick={() => openEdit(m)}>
                        Editar
                      </button>
                      {!m.predictionsLocked && (
                        <button className={`${s.actionBtn} ${s.lockBtn}`} onClick={() => lockMatch(m.id)}>
                          <Lock size={13} /> Bloquear palpites
                        </button>
                      )}
                      {msg?.id === m.id && (
                        <span className={msg.type === 'ok' ? s.msgOk : s.msgErr}>{msg.text}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ CHAVEAMENTO ═══ */}
        {!loading && tab === 'bracket' && (
          <>
            {bracketMsg && (
              <div className={bracketMsg.type === 'ok' ? s.msgOk : s.msgErr} style={{ marginBottom: 16 }}>
                {bracketMsg.text}
              </div>
            )}

            <div className={s.bracketHeader}>
              <button
                className={`btn btn-outline ${s.mountBtn}`}
                onClick={mountR32}
                disabled={mounting}
              >
                <Trophy size={16} /> {mounting ? 'Montando...' : 'Montar R32'}
              </button>
              <span className={s.bracketInfo}>{bracket.length} slots criados</span>
            </div>

            {bracket.length === 0 && (
              <div className={s.empty}>
                <div className={s.emptyIcon}><Building2 size={40} /></div>
                <div className={s.emptyTitle}>Chaveamento vazio</div>
                <div className={s.emptySub}>
                  Clique em "Montar R32" após todos os grupos serem classificados
                </div>
              </div>
            )}

            {ROUND_ORDER.filter((r) => bracketByRound[r]).map((round) => (
              <div key={round} className={s.bracketRound}>
                <div className={s.roundTitle}>{ROUND_LABELS[round]}</div>
                {bracketByRound[round]
                  .sort((a, b) => a.slotNumber - b.slotNumber)
                  .map((slot) => (
                    <div key={slot.id} className={`${s.slotCard} ${slot.winnerTeam ? s.slotDone : ''}`}>
                      <div className={s.slotHeader}>
                        <span className={s.slotNum}>#{slot.slotNumber}</span>
                        {slot.winnerTeam && (
                          <span className={s.winnerBadge}><Trophy size={12} /> {slot.winnerTeam}</span>
                        )}
                      </div>

                      <div className={s.slotTeams}>
                        <span className={`${s.slotTeam} ${slot.winnerTeam === slot.homeTeam ? s.slotWinner : ''}`}>
                          {slot.homeTeam ?? <span className={s.slotTbd}>{slot.homeDesc}</span>}
                        </span>
                        <span className={s.slotVs}>vs</span>
                        <span className={`${s.slotTeam} ${slot.winnerTeam === slot.awayTeam ? s.slotWinner : ''}`}>
                          {slot.awayTeam ?? <span className={s.slotTbd}>{slot.awayDesc}</span>}
                        </span>
                      </div>

                      {!slot.winnerTeam && slot.homeTeam && slot.awayTeam && (
                        <div className={s.winnerRow}>
                          <select
                            className={s.winnerSelect}
                            value={winnerInputs[slot.id] ?? ''}
                            onChange={(e) =>
                              setWinnerInputs((prev) => ({ ...prev, [slot.id]: e.target.value }))
                            }
                          >
                            <option value="">Selecionar vencedor...</option>
                            <option value={slot.homeTeam}>{slot.homeTeam}</option>
                            <option value={slot.awayTeam}>{slot.awayTeam}</option>
                          </select>
                          <button
                            className={s.winnerBtn}
                            onClick={() => setWinner(slot.id)}
                            disabled={!winnerInputs[slot.id]}
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      )}

                      {!slot.winnerTeam && (!slot.homeTeam || !slot.awayTeam) && (
                        <div className={s.slotPending}>Aguardando classificados</div>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
