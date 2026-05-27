import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Lock, Unlock, Check, Trophy, Flag,
  Calendar, Building2, RotateCcw, AlertTriangle, ChevronDown,
  ChevronUp, Zap, X, Save, Shield,
} from 'lucide-react'
import {
  adminGetMatches, adminUpdateScore, adminUpdateStatus, adminLockMatch,
  adminUnlockMatch, adminReprocessMatch, adminFinalizeMatch, adminUpdateDate,
  adminMountR32, adminSetKnockoutResult, adminResetMatch, getBracket,
  adminSyncR32Teams, adminResetSlotResult, adminOverrideSlotTeams,
  type Match, type BracketSlot,
} from '@/services/cravouService'
import { formatMatchDate, phaseLabel, statusLabel } from '@/utils/format'
import { CountryBadge } from '@/components/CountryBadge'
import s from './Admin.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'matches' | 'bracket'
type PhaseFilter = 'all' | 'group_stage' | 'knockout'
type StatusFilter = 'all' | 'upcoming' | 'live' | 'awaiting_result' | 'finished'

interface Toast { type: 'ok' | 'err'; text: string }
interface ConfirmState {
  title: string
  matchLabel: string
  consequences: string[]
  action: () => Promise<void>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROUND_ORDER = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final']
const ROUND_LABELS: Record<string, string> = {
  round_of_32: '16 Avos',
  round_of_16: 'Oitavas de Final',
  quarterfinal: 'Quartas de Final',
  semifinal: 'Semifinal',
  third_place: '3º Lugar',
  final: 'Final',
}

function toDatetimeLocal(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── Admin Page ────────────────────────────────────────────────────────────────

export default function Admin() {
  const [tab, setTab] = useState<Tab>('matches')
  const [matches, setMatches] = useState<Match[]>([])
  const [bracket, setBracket] = useState<BracketSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const [winnerInputs, setWinnerInputs] = useState<Record<string, string>>({})
  const [bracketMsg, setBracketMsg] = useState<Toast | null>(null)
  const [mounting, setMounting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState<Set<string>>(new Set())
  const [overrideInputs, setOverrideInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [resettingSlots, setResettingSlots] = useState<Set<string>>(new Set())

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    const [m, b] = await Promise.all([
      adminGetMatches().catch(() => []),
      getBracket().catch(() => []),
    ])
    setMatches(m)
    setBracket(b)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    async function init() {
      const [m, b] = await Promise.all([
        adminGetMatches().catch(() => []),
        getBracket().catch(() => []),
      ])
      setMatches(m)
      setBracket(b)
      setLoading(false)
    }
    init()
  }, [])

  function showToast(type: 'ok' | 'err', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  async function runConfirm() {
    if (!confirm) return
    setConfirmLoading(true)
    try { await confirm.action() } finally {
      setConfirmLoading(false)
      setConfirm(null)
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: matches.length,
    upcoming: matches.filter(m => m.status === 'upcoming').length,
    live: matches.filter(m => m.status === 'live').length,
    awaiting: matches.filter(m => m.status === 'awaiting_result').length,
    finished: matches.filter(m => m.status === 'finished').length,
  }), [matches])

  const filtered = useMemo(() =>
    matches
      .filter(m => phaseFilter === 'all' || (phaseFilter === 'group_stage' ? m.phase === 'group_stage' : m.phase !== 'group_stage'))
      .filter(m => statusFilter === 'all' || m.status === statusFilter)
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()),
    [matches, phaseFilter, statusFilter]
  )

  const bracketByRound = useMemo(() => {
    const rounds: Record<string, BracketSlot[]> = {}
    for (const slot of bracket) {
      if (!rounds[slot.round]) rounds[slot.round] = []
      rounds[slot.round].push(slot)
    }
    return rounds
  }, [bracket])

  // ── Bracket actions ────────────────────────────────────────────────────────

  function askMountR32() {
    setConfirm({
      title: 'Montar Round of 32',
      matchLabel: 'Chaveamento completo',
      consequences: [
        'Serão criados 16 slots com os classificados',
        'Os 8 melhores terceiros serão distribuídos',
        'Grupos precisam estar todos finalizados',
      ],
      action: async () => {
        setMounting(true)
        try {
          await adminMountR32()
          setBracketMsg({ type: 'ok', text: 'R32 montado com sucesso!' })
          await load(true)
        } catch {
          setBracketMsg({ type: 'err', text: 'Erro ao montar R32. Verifique se os grupos estão classificados.' })
        } finally { setMounting(false) }
      },
    })
  }

  async function syncR32Teams() {
    setSyncing(true)
    setBracketMsg(null)
    try {
      await adminSyncR32Teams()
      setBracketMsg({ type: 'ok', text: 'Times sincronizados com as standings!' })
      await load(true)
    } catch {
      setBracketMsg({ type: 'err', text: 'Erro ao sincronizar times.' })
    } finally { setSyncing(false) }
  }

  async function resetWinner(slotId: string) {
    setResettingSlots(prev => new Set([...prev, slotId]))
    setBracketMsg(null)
    try {
      await adminResetSlotResult(slotId)
      setBracketMsg({ type: 'ok', text: 'Resultado removido.' })
      await load(true)
    } catch {
      setBracketMsg({ type: 'err', text: 'Erro ao remover resultado.' })
    } finally {
      setResettingSlots(prev => { const s = new Set(prev); s.delete(slotId); return s })
    }
  }

  async function saveOverrideTeams(slotId: string) {
    const inp = overrideInputs[slotId]
    if (!inp?.home && !inp?.away) return
    setBracketMsg(null)
    try {
      await adminOverrideSlotTeams(slotId, inp.home || undefined, inp.away || undefined)
      setBracketMsg({ type: 'ok', text: 'Times atualizados!' })
      setOverrideInputs(prev => { const n = { ...prev }; delete n[slotId]; return n })
      setOverrideOpen(prev => { const s = new Set(prev); s.delete(slotId); return s })
      await load(true)
    } catch {
      setBracketMsg({ type: 'err', text: 'Erro ao atualizar times.' })
    }
  }

  function toggleOverride(slotId: string) {
    setOverrideOpen(prev => {
      const s = new Set(prev)
      if (s.has(slotId)) { s.delete(slotId) } else { s.add(slotId) }
      return s
    })
  }

  async function setWinner(slotId: string) {
    const winner = winnerInputs[slotId]?.trim()
    if (!winner) return
    setBracketMsg(null)
    try {
      await adminSetKnockoutResult(slotId, winner)
      setBracketMsg({ type: 'ok', text: `Vencedor definido: ${winner}` })
      setWinnerInputs(prev => ({ ...prev, [slotId]: '' }))
      await load(true)
    } catch {
      setBracketMsg({ type: 'err', text: 'Erro ao definir vencedor.' })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app-layout">
      <div className="page fade-up">

        {/* Header */}
        <div className={s.header}>
          <Link to="/profile" className={s.back}><ArrowLeft size={18} /></Link>
          <div className={s.headerText}>
            <div className={s.title}>Painel Admin</div>
            <div className={s.subtitle}>Copa do Mundo 2026</div>
          </div>
          <button className={s.refreshBtn} onClick={() => load(true)} disabled={refreshing} title="Atualizar">
            <RefreshCw size={16} className={refreshing ? s.spin : ''} />
          </button>
        </div>

        {/* Stats Strip */}
        {!loading && (
          <div className={s.statsStrip}>
            <div className={`${s.statItem}`} onClick={() => setStatusFilter('all')}>
              <div className={s.statNum}>{stats.total}</div>
              <div className={s.statLabel}>Total</div>
            </div>
            <div className={`${s.statItem} ${s.statUpcoming}`} onClick={() => { setStatusFilter('upcoming'); setTab('matches') }}>
              <div className={s.statNum}>{stats.upcoming}</div>
              <div className={s.statLabel}>Agendados</div>
            </div>
            <div className={`${s.statItem} ${s.statLive}`} onClick={() => { setStatusFilter('live'); setTab('matches') }}>
              {stats.live > 0 && <span className={s.statLiveDot} />}
              <div className={s.statNum}>{stats.live}</div>
              <div className={s.statLabel}>Ao vivo</div>
            </div>
            <div className={`${s.statItem} ${s.statAwaiting}`} onClick={() => { setStatusFilter('awaiting_result'); setTab('matches') }}>
              <div className={s.statNum}>{stats.awaiting}</div>
              <div className={s.statLabel}>Aguardando</div>
            </div>
            <div className={`${s.statItem} ${s.statFinished}`} onClick={() => { setStatusFilter('finished'); setTab('matches') }}>
              <div className={s.statNum}>{stats.finished}</div>
              <div className={s.statLabel}>Encerrados</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={s.tabs}>
          <button className={`${s.tab} ${tab === 'matches' ? s.tabActive : ''}`} onClick={() => setTab('matches')}>
            Partidas
          </button>
          <button className={`${s.tab} ${tab === 'bracket' ? s.tabActive : ''}`} onClick={() => setTab('bracket')}>
            Chaveamento
          </button>
        </div>

        {loading && [1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 110, marginBottom: 10 }} />
        ))}

        {/* ══ PARTIDAS ══════════════════════════════════════════════ */}
        {!loading && tab === 'matches' && (
          <>
            <div className={s.filters}>
              <div className={s.filterRow}>
                {(['all', 'group_stage', 'knockout'] as PhaseFilter[]).map(f => (
                  <button key={f} className={`${s.pill} ${phaseFilter === f ? s.pillActive : ''}`} onClick={() => setPhaseFilter(f)}>
                    {f === 'all' ? 'Todos' : f === 'group_stage' ? 'Grupos' : 'Mata-mata'}
                  </button>
                ))}
              </div>
              <div className={s.filterRow}>
                {(['all', 'upcoming', 'live', 'awaiting_result', 'finished'] as StatusFilter[]).map(f => (
                  <button key={f} className={`${s.pill} ${statusFilter === f ? s.pillActive : ''}`} onClick={() => setStatusFilter(f)}>
                    {f === 'all' ? 'Todos' : statusLabel(f)}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.matchCount}>{filtered.length} {filtered.length === 1 ? 'partida' : 'partidas'}</div>

            <div className={s.matchList}>
              {filtered.map(m => (
                <MatchCard
                  key={`${m.id}-${m.status}-${m.homeScore ?? 'n'}-${m.awayScore ?? 'n'}-${m.matchDate}`}
                  match={m}
                  isExpanded={expandedId === m.id}
                  onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  onReload={() => load(true)}
                  onToast={showToast}
                  onConfirm={setConfirm}
                />
              ))}
            </div>
          </>
        )}

        {/* ══ CHAVEAMENTO ═══════════════════════════════════════════ */}
        {!loading && tab === 'bracket' && (
          <>
            {bracketMsg && (
              <div className={bracketMsg.type === 'ok' ? s.inlineOk : s.inlineErr} style={{ marginBottom: 16 }}>
                {bracketMsg.text}
              </div>
            )}

            <div className={s.bracketHeader}>
              <button className={`btn btn-outline ${s.mountBtn}`} onClick={askMountR32} disabled={mounting}>
                <Trophy size={16} /> {mounting ? 'Montando...' : 'Montar R32'}
              </button>
              <button className={`btn btn-outline ${s.mountBtn}`} onClick={syncR32Teams} disabled={syncing}>
                <RefreshCw size={16} /> {syncing ? 'Sincronizando...' : 'Sincronizar Times'}
              </button>
              <span className={s.bracketInfo}>{bracket.length} slots</span>
            </div>

            {bracket.length === 0 && (
              <div className={s.empty}>
                <div className={s.emptyIcon}><Building2 size={40} /></div>
                <div className={s.emptyTitle}>Chaveamento vazio</div>
                <div className={s.emptySub}>Clique em "Montar R32" após todos os grupos serem finalizados</div>
              </div>
            )}

            {ROUND_ORDER.filter(r => bracketByRound[r]).map(round => (
              <div key={round} className={s.bracketRound}>
                <div className={s.roundTitle}>{ROUND_LABELS[round]}</div>
                {bracketByRound[round].sort((a, b) => a.slotNumber - b.slotNumber).map(slot => {
                  const showOverride = overrideOpen.has(slot.id) || !slot.homeTeam || !slot.awayTeam
                  const ovr = overrideInputs[slot.id]
                  return (
                    <div key={slot.id} className={`${s.slotCard} ${slot.winnerTeam ? s.slotDone : ''}`}>
                      <div className={s.slotHeader}>
                        <span className={s.slotNum}>#{slot.slotNumber}</span>
                        <div className={s.slotHeaderActions}>
                          {slot.winnerTeam && <span className={s.winnerBadge}><Trophy size={12} /> {slot.winnerTeam}</span>}
                          <button className={s.slotEditBtn} onClick={() => toggleOverride(slot.id)} title="Editar times">
                            <Save size={11} />
                          </button>
                        </div>
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
                          <select className={s.winnerSelect} value={winnerInputs[slot.id] ?? ''} onChange={e => setWinnerInputs(prev => ({ ...prev, [slot.id]: e.target.value }))}>
                            <option value="">Selecionar vencedor...</option>
                            <option value={slot.homeTeam}>{slot.homeTeam}</option>
                            <option value={slot.awayTeam}>{slot.awayTeam}</option>
                          </select>
                          <button className={s.winnerBtn} onClick={() => setWinner(slot.id)} disabled={!winnerInputs[slot.id]}>
                            <Check size={14} />
                          </button>
                        </div>
                      )}

                      {slot.winnerTeam && (
                        <button
                          className={s.desfazerBtn}
                          onClick={() => resetWinner(slot.id)}
                          disabled={resettingSlots.has(slot.id)}
                        >
                          <RotateCcw size={11} /> {resettingSlots.has(slot.id) ? 'Removendo...' : 'Desfazer resultado'}
                        </button>
                      )}

                      {showOverride && (
                        <div className={s.overrideForm}>
                          <input
                            className={s.overrideInput}
                            placeholder={slot.homeTeam ?? slot.homeDesc}
                            value={ovr?.home ?? ''}
                            onChange={e => setOverrideInputs(prev => ({ ...prev, [slot.id]: { home: e.target.value, away: prev[slot.id]?.away ?? '' } }))}
                          />
                          <input
                            className={s.overrideInput}
                            placeholder={slot.awayTeam ?? slot.awayDesc}
                            value={ovr?.away ?? ''}
                            onChange={e => setOverrideInputs(prev => ({ ...prev, [slot.id]: { home: prev[slot.id]?.home ?? '', away: e.target.value } }))}
                          />
                          <button
                            className={s.winnerBtn}
                            onClick={() => saveOverrideTeams(slot.id)}
                            disabled={!ovr?.home && !ovr?.away}
                          >
                            <Save size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div className={`${s.toastBar} ${toast.type === 'ok' ? s.toastOk : s.toastErr}`}>
          {toast.type === 'ok' ? <Check size={13} /> : <AlertTriangle size={13} />}
          <span>{toast.text}</span>
          <button className={s.toastClose} onClick={() => setToast(null)}><X size={12} /></button>
        </div>
      )}

      {/* ── Confirmation Modal ────────────────────────────────────── */}
      {confirm && (
        <div className={s.overlay} onClick={() => !confirmLoading && setConfirm(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalIconWrap}>
              <AlertTriangle size={26} />
            </div>
            <div className={s.modalTitle}>{confirm.title}</div>
            <div className={s.modalMatch}>{confirm.matchLabel}</div>
            <ul className={s.modalList}>
              {confirm.consequences.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
            <div className={s.modalActions}>
              <button className={s.modalCancel} onClick={() => setConfirm(null)} disabled={confirmLoading}>
                Cancelar
              </button>
              <button className={s.modalConfirm} onClick={runConfirm} disabled={confirmLoading}>
                {confirmLoading ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MatchCard ─────────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: Match
  isExpanded: boolean
  onToggle: () => void
  onReload: () => Promise<void>
  onToast: (type: 'ok' | 'err', text: string) => void
  onConfirm: (c: ConfirmState) => void
}

function MatchCard({ match: m, isExpanded, onToggle, onReload, onToast, onConfirm }: MatchCardProps) {
  const [editHome, setEditHome] = useState(m.homeScore !== null ? String(m.homeScore) : '')
  const [editAway, setEditAway] = useState(m.awayScore !== null ? String(m.awayScore) : '')
  const [editStatus, setEditStatus] = useState(m.status)
  const [editDate, setEditDate] = useState(toDatetimeLocal(m.matchDate))
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [savingDate, setSavingDate] = useState(false)

  async function doFinalize() {
    const h = parseInt(editHome), a = parseInt(editAway)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) { onToast('err', 'Informe um placar válido.'); return }
    setFinalizing(true)
    try {
      await adminFinalizeMatch(m.id, h, a)
      onToast('ok', `Resultado: ${m.homeTeam} ${h}×${a} ${m.awayTeam} — pontos calculados!`)
      onToggle()
      await onReload()
    } catch { onToast('err', 'Erro ao finalizar partida.') }
    finally { setFinalizing(false) }
  }

  async function doSaveScore() {
    const h = parseInt(editHome), a = parseInt(editAway)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) { onToast('err', 'Placar inválido.'); return }
    setSaving(true)
    try {
      await adminUpdateScore(m.id, h, a)
      onToast('ok', 'Placar atualizado!')
      await onReload()
    } catch { onToast('err', 'Erro ao salvar placar.') }
    finally { setSaving(false) }
  }

  async function doSaveStatus() {
    if (editStatus === m.status) return
    setSaving(true)
    try {
      await adminUpdateStatus(m.id, editStatus)
      onToast('ok', `Status: ${statusLabel(editStatus)}`)
      await onReload()
    } catch { onToast('err', 'Erro ao atualizar status.') }
    finally { setSaving(false) }
  }

  async function doSaveDate() {
    if (!editDate) return
    setSavingDate(true)
    try {
      await adminUpdateDate(m.id, new Date(editDate).toISOString())
      onToast('ok', 'Data atualizada! Cron ajusta status em até 1 min.')
      await onReload()
    } catch { onToast('err', 'Erro ao atualizar data.') }
    finally { setSavingDate(false) }
  }

  async function doReprocess() {
    try {
      await adminReprocessMatch(m.id)
      onToast('ok', 'Pontuações reprocessadas!')
      await onReload()
    } catch { onToast('err', 'Erro ao reprocessar.') }
  }

  async function doLock() {
    try {
      await adminLockMatch(m.id)
      onToast('ok', 'Palpites bloqueados!')
      await onReload()
    } catch { onToast('err', 'Erro ao bloquear.') }
  }

  async function doUnlock() {
    try {
      await adminUnlockMatch(m.id)
      onToast('ok', 'Palpites desbloqueados!')
      await onReload()
    } catch { onToast('err', 'Erro ao desbloquear.') }
  }

  function askReset() {
    const inFuture = new Date(m.matchDate).getTime() > Date.now()
    onConfirm({
      title: 'Resetar partida',
      matchLabel: `${m.homeTeam} × ${m.awayTeam}`,
      consequences: [
        'Placar será apagado (volta a "vs")',
        'Pontos de todos os palpiteiros serão zerados',
        inFuture
          ? 'Status volta para "Agendado" e palpites ficam abertos'
          : 'Status volta para "Aguardando resultado"',
      ],
      action: async () => {
        try {
          const result = await adminResetMatch(m.id)
          onToast('ok', `Resetado! ${result.affectedUsers} usuário(s) afetado(s).`)
          await onReload()
        } catch { onToast('err', 'Erro ao resetar partida.') }
      },
    })
  }

  const borderClass = {
    live: s.borderLive,
    finished: s.borderFinished,
    awaiting_result: s.borderAwaiting,
    upcoming: m.predictionsLocked ? s.borderLocked : s.borderUpcoming,
    locked: s.borderLocked,
  }[m.status] ?? s.borderUpcoming

  const badgeClass = {
    live: s.badgeLive,
    finished: s.badgeFinished,
    awaiting_result: s.badgeAwaiting,
    upcoming: s.badgeUpcoming,
    locked: s.badgeLocked,
  }[m.status] ?? s.badgeUpcoming

  const statusName = {
    upcoming: 'Agendado',
    live: 'Ao vivo',
    awaiting_result: 'Aguardando',
    finished: 'Encerrado',
    locked: 'Bloqueado',
  }[m.status] ?? m.status

  return (
    <div className={`${s.matchCard} ${borderClass}`}>

      {/* ── Card Header ── */}
      <div className={s.cardTop}>
        <div className={s.cardMeta}>
          <span className={s.cardGroup}>
            {m.groupName ? `Grupo ${m.groupName}` : phaseLabel(m.phase)}
            {m.groupRound ? ` · R${m.groupRound}` : ''}
          </span>
          <span className={s.cardDate}>{formatMatchDate(m.matchDate)}</span>
        </div>
        <div className={s.cardBadges}>
          <span className={`${s.statusBadge} ${badgeClass}`}>
            {m.status === 'live' && <span className={s.livePulse} />}
            {statusName}
          </span>
          {m.predictionsLocked
            ? <span className={s.lockBadge} title="Palpites bloqueados"><Lock size={11} /></span>
            : <span className={s.unlockBadge} title="Palpites abertos"><Unlock size={11} /></span>
          }
        </div>
      </div>

      {/* ── Teams + Score ── */}
      <div className={s.cardTeams}>
        <div className={s.cardTeam}>
          <CountryBadge country={m.homeTeam} size="sm" />
          <span className={s.cardTeamName}>{m.homeTeam}</span>
        </div>
        <div className={s.cardScore}>
          {m.homeScore !== null && m.awayScore !== null
            ? <span className={s.scoreText}>{m.homeScore} — {m.awayScore}</span>
            : <span className={s.vsText}>vs</span>
          }
        </div>
        <div className={`${s.cardTeam} ${s.cardTeamAway}`}>
          <span className={s.cardTeamName}>{m.awayTeam}</span>
          <CountryBadge country={m.awayTeam} size="sm" />
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className={s.quickActions}>
        <button className={`${s.qBtn} ${isExpanded ? s.qBtnActive : ''}`} onClick={onToggle}>
          {isExpanded ? <><ChevronUp size={12} /> Fechar</> : <><ChevronDown size={12} /> Editar</>}
        </button>

        {!m.predictionsLocked ? (
          <button className={`${s.qBtn} ${s.qBtnGold}`} onClick={doLock} title="Bloquear palpites">
            <Lock size={12} /> Bloquear
          </button>
        ) : m.status === 'upcoming' ? (
          <button className={`${s.qBtn}`} onClick={doUnlock} title="Desbloquear palpites">
            <Unlock size={12} /> Desbloquear
          </button>
        ) : null}

        {m.status === 'finished' && (
          <button className={`${s.qBtn}`} onClick={doReprocess} title="Recalcular pontos">
            <RefreshCw size={12} /> Recalcular
          </button>
        )}

        <button className={`${s.qBtn} ${s.qBtnDanger}`} onClick={askReset} title="Resetar partida">
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* ── Expanded Edit Panel ── */}
      {isExpanded && (
        <div className={s.editPanel}>

          {/* Resultado */}
          <div className={s.editSection}>
            <div className={s.sectionLabel}><Flag size={12} /> Resultado</div>
            <div className={s.scoreRow}>
              <div className={s.scoreGroup}>
                <span className={s.scoreTeam}>{m.homeTeam}</span>
                <input className={s.scoreInput} type="number" min={0} max={30} placeholder="0"
                  value={editHome} onChange={e => setEditHome(e.target.value)} />
              </div>
              <span className={s.scoreSep}>×</span>
              <div className={s.scoreGroup}>
                <span className={s.scoreTeam}>{m.awayTeam}</span>
                <input className={s.scoreInput} type="number" min={0} max={30} placeholder="0"
                  value={editAway} onChange={e => setEditAway(e.target.value)} />
              </div>
            </div>

            {m.status !== 'finished' && (
              <button className={s.finalizeBtn} onClick={doFinalize} disabled={finalizing}>
                <Zap size={15} /> {finalizing ? 'Finalizando...' : 'Registrar Resultado Final'}
              </button>
            )}

            <div className={s.rowActions}>
              <button className={s.secBtn} onClick={doSaveScore} disabled={saving}>
                <Save size={12} /> Só placar
              </button>
              <button className={s.secBtn} onClick={doReprocess} disabled={m.status !== 'finished'} title={m.status !== 'finished' ? 'Disponível apenas em partidas encerradas' : ''}>
                <RefreshCw size={12} /> Recalcular pts
              </button>
            </div>
          </div>

          {/* Status */}
          <div className={s.editSection}>
            <div className={s.sectionLabel}>Status manual</div>
            <div className={s.rowActions}>
              <select className={s.statusSelect} value={editStatus} onChange={e => setEditStatus(e.target.value as typeof editStatus)}>
                <option value="upcoming">Agendado</option>
                <option value="locked">Bloqueado</option>
                <option value="live">Ao vivo</option>
                <option value="awaiting_result">Aguardando resultado</option>
                <option value="finished">Encerrado</option>
              </select>
              <button className={s.secBtn} onClick={doSaveStatus} disabled={saving}>
                <Save size={12} /> Salvar
              </button>
            </div>
          </div>

          {/* Data/Hora */}
          <div className={s.editSection}>
            <div className={s.sectionLabel}>
              <Calendar size={12} /> Data / hora
              <span className={s.testPill}>testes</span>
            </div>
            <div className={s.rowActions}>
              <input className={s.dateInput} type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} />
              <button className={s.secBtn} onClick={doSaveDate} disabled={savingDate}>
                {savingDate ? 'Salvando...' : 'Alterar'}
              </button>
            </div>
            <div className={s.hint}>Mude para +1min → cron bloqueia palpites automaticamente.</div>
          </div>

          {/* Zona de Perigo */}
          <div className={`${s.editSection} ${s.dangerZone}`}>
            <div className={s.sectionLabel}><Shield size={12} /> Zona de Perigo</div>
            <button className={s.dangerBtn} onClick={askReset}>
              <RotateCcw size={14} /> Resetar Partida
            </button>
            <div className={s.hint}>Apaga placar, zera pontos e reverte o status conforme o horário do jogo.</div>
          </div>
        </div>
      )}
    </div>
  )
}
