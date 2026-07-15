import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Lock, Unlock, Check, Trophy, Flag,
  Calendar, RotateCcw, AlertTriangle, ChevronDown,
  ChevronUp, Zap, X, Save, Shield, Pencil, Search, Sparkles, Eye, Ban,
} from 'lucide-react'
import {
  adminGetMatches, adminUpdateScore, adminUpdateStatus, adminLockMatch,
  adminUnlockMatch, adminReprocessMatch, adminFinalizeMatch, adminUpdateDate,
  adminResetMatch, getBracket,
  adminOverrideSlotTeams,
  adminCreateMatchFromSlot,
  adminUnlinkMatchFromSlot,
  adminInitializeAllSlots,
  adminActivateWrappedPreview, adminReleaseWrapped, adminDeactivateWrapped, adminGetWrappedRawStatus,
  type Match, type BracketSlot,
} from '@/services/cravouService'
import { formatMatchDate, phaseLabel, statusLabel } from '@/utils/format'
import { CountryBadge } from '@/components/CountryBadge'
import { TeamSearchInput } from '@/components/TeamSearchInput/TeamSearchInput'
import s from './Admin.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'matches' | 'bracket' | 'wrapped'
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
const ROUND_SLOT_COUNT: Record<string, number> = {
  round_of_32: 16, round_of_16: 8, quarterfinal: 4, semifinal: 2, third_place: 1, final: 1,
}

// Converts UTC ISO string to datetime-local value in São Paulo timezone
function toDatetimeLocal(dateStr: string): string {
  const d = new Date(dateStr)
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

// Interprets datetime-local input as São Paulo timezone and returns UTC ISO string
function fromDatetimeLocal(localStr: string): string {
  // Create a date object treating the input as São Paulo time
  const [date, time] = localStr.split('T')
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  // Use Intl to find the UTC offset for São Paulo at this moment
  const approx = new Date(y, mo - 1, d, h, mi)
  const utcStr = approx.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  const utcDate = new Date(utcStr)
  const offset = approx.getTime() - utcDate.getTime()
  return new Date(approx.getTime() - offset).toISOString()
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
  const [searchQuery, setSearchQuery] = useState('')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const [wrappedRaw, setWrappedRaw] = useState<{ status: string; activatedAt: string | null } | null>(null)
  const [wrappedLoading, setWrappedLoading] = useState(false)
  const [wrappedMsg, setWrappedMsg] = useState<Toast | null>(null)

  const [bracketMsg, setBracketMsg] = useState<Toast | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState<Set<string>>(new Set())
  const [overrideInputs, setOverrideInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [bracketRound, setBracketRound] = useState('round_of_32')
  const [slotDates, setSlotDates] = useState<Record<string, string>>({})
  const [creatingMatch, setCreatingMatch] = useState<Set<string>>(new Set())

  // unified load — silent skips the loading overlay
  // Uses allSettled so a failed request never wipes existing data
  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const [mResult, bResult] = await Promise.allSettled([
        adminGetMatches(),
        getBracket(),
      ])
      if (mResult.status === 'fulfilled') setMatches(mResult.value)
      if (bResult.status === 'fulfilled') setBracket(bResult.value)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function showToast(type: 'ok' | 'err', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  // Optimistic match update — updates one match in-place immediately
  const updateMatch = useCallback((matchId: string, updates: Partial<Match>) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...updates } : m))
  }, [])

  // Optimistic bracket slot update
  const updateSlot = useCallback((slotId: string, updates: Partial<BracketSlot>) => {
    setBracket(prev => prev.map(s => s.id === slotId ? { ...s, ...updates } : s))
  }, [])

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

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return matches
      .filter(m => phaseFilter === 'all' || (phaseFilter === 'group_stage' ? m.phase === 'group_stage' : m.phase !== 'group_stage'))
      .filter(m => statusFilter === 'all' || m.status === statusFilter)
      .filter(m => !q || m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q))
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
  }, [matches, phaseFilter, statusFilter, searchQuery])

  const bracketByRound = useMemo(() => {
    const rounds: Record<string, BracketSlot[]> = {}
    for (const slot of bracket) {
      if (!rounds[slot.round]) rounds[slot.round] = []
      rounds[slot.round].push(slot)
    }
    return rounds
  }, [bracket])

  // ── Cravou Wrapped ─────────────────────────────────────────────────────────

  const loadWrappedStatus = useCallback(async () => {
    setWrappedLoading(true)
    try {
      const raw = await adminGetWrappedRawStatus()
      setWrappedRaw(raw)
    } catch {
      setWrappedMsg({ type: 'err', text: 'Erro ao carregar status da retrospectiva.' })
    } finally {
      setWrappedLoading(false)
    }
  }, [])

  useEffect(() => { if (tab === 'wrapped') loadWrappedStatus() }, [tab, loadWrappedStatus])

  async function activatePreview() {
    setWrappedLoading(true)
    try {
      await adminActivateWrappedPreview()
      setWrappedMsg({ type: 'ok', text: 'Prévia ativada! Só a sua conta vai ver a retrospectiva agora.' })
      await loadWrappedStatus()
    } catch {
      setWrappedMsg({ type: 'err', text: 'Erro ao ativar a prévia.' })
    } finally {
      setWrappedLoading(false)
    }
  }

  function confirmRelease() {
    setConfirm({
      title: 'Liberar retrospectiva pra todo mundo',
      matchLabel: 'Cravou Wrapped 2026',
      consequences: [
        'Todas as contas passam a ver a retrospectiva ao abrir o app',
        'Sua conta também vai ver a experiência completa de novo, do zero',
        'Essa ação não tem "voltar atrás" fácil — use Desativar se precisar corrigir algo depois',
      ],
      action: async () => {
        await adminReleaseWrapped()
        setWrappedMsg({ type: 'ok', text: 'Liberado! Todo mundo já pode ver a retrospectiva.' })
        await loadWrappedStatus()
      },
    })
  }

  async function deactivateWrapped() {
    setWrappedLoading(true)
    try {
      await adminDeactivateWrapped()
      setWrappedMsg({ type: 'ok', text: 'Retrospectiva desativada.' })
      await loadWrappedStatus()
    } catch {
      setWrappedMsg({ type: 'err', text: 'Erro ao desativar.' })
    } finally {
      setWrappedLoading(false)
    }
  }

  // ── Bracket actions ────────────────────────────────────────────────────────

  async function initializeSlots() {
    setInitializing(true)
    setBracketMsg(null)
    try {
      const result = await adminInitializeAllSlots()
      setBracketMsg({ type: 'ok', text: `Pronto! ${result.created} slots criados (${result.existing} já existiam).` })
      load(true)
    } catch {
      setBracketMsg({ type: 'err', text: 'Erro ao inicializar slots.' })
    } finally { setInitializing(false) }
  }

  async function _commitOverrideTeams(slotId: string, newHome: string | null | undefined, newAway: string | null | undefined) {
    await adminOverrideSlotTeams(slotId, newHome, newAway)
    setBracketMsg({ type: 'ok', text: 'Times atualizados!' })
    setOverrideInputs(prev => { const n = { ...prev }; delete n[slotId]; return n })
    setOverrideOpen(prev => { const ns = new Set(prev); ns.delete(slotId); return ns })
    // Optimistic update — only include fields that were actually changed
    // (spreading undefined overwrites existing value with undefined, reopening the form)
    const slotUpdates: Partial<BracketSlot> = {}
    if (newHome !== undefined) slotUpdates.homeTeam = newHome
    if (newAway !== undefined) slotUpdates.awayTeam = newAway
    updateSlot(slotId, slotUpdates)
    load(true)  // background sync
  }

  async function saveOverrideTeams(slotId: string) {
    const inp = overrideInputs[slotId]
    const newHome = inp?.home?.trim() || undefined
    const newAway = inp?.away?.trim() || undefined
    if (!newHome && !newAway) return

    type Conflict = { slotId: string; slotNumber: number; side: 'home' | 'away'; team: string }
    const conflicts: Conflict[] = []
    for (const other of bracketByRound[bracketRound] ?? []) {
      if (other.id === slotId) continue
      if (newHome) {
        if (other.homeTeam?.toLowerCase() === newHome.toLowerCase())
          conflicts.push({ slotId: other.id, slotNumber: other.slotNumber, side: 'home', team: newHome })
        else if (other.awayTeam?.toLowerCase() === newHome.toLowerCase())
          conflicts.push({ slotId: other.id, slotNumber: other.slotNumber, side: 'away', team: newHome })
      }
      if (newAway && newAway.toLowerCase() !== (newHome ?? '').toLowerCase()) {
        if (other.homeTeam?.toLowerCase() === newAway.toLowerCase())
          conflicts.push({ slotId: other.id, slotNumber: other.slotNumber, side: 'home', team: newAway })
        else if (other.awayTeam?.toLowerCase() === newAway.toLowerCase())
          conflicts.push({ slotId: other.id, slotNumber: other.slotNumber, side: 'away', team: newAway })
      }
    }

    if (conflicts.length > 0) {
      setConfirm({
        title: 'Mover seleção',
        matchLabel: [...new Set(conflicts.map(c => c.team))].join(' e '),
        consequences: [
          ...conflicts.map(c => `${c.team} será removida do Confronto #${c.slotNumber}`),
          'A seleção será adicionada a este confronto',
        ],
        action: async () => {
          try {
            for (const c of conflicts) {
              await adminOverrideSlotTeams(
                c.slotId,
                c.side === 'home' ? null : undefined,
                c.side === 'away' ? null : undefined,
              )
            }
            // Optimistic update for cleared conflict slots
            setBracket(prev => prev.map(s => {
              const conflict = conflicts.find(c => c.slotId === s.id)
              if (!conflict) return s
              return {
                ...s,
                homeTeam: conflict.side === 'home' ? null : s.homeTeam,
                awayTeam: conflict.side === 'away' ? null : s.awayTeam,
              }
            }))
            await _commitOverrideTeams(slotId, newHome, newAway)
          } catch {
            setBracketMsg({ type: 'err', text: 'Erro ao mover seleção.' })
          }
        },
      })
      return
    }

    setBracketMsg(null)
    try {
      await _commitOverrideTeams(slotId, newHome, newAway)
    } catch {
      setBracketMsg({ type: 'err', text: 'Erro ao atualizar times.' })
    }
  }

  function toggleOverride(slotId: string) {
    setOverrideOpen(prev => {
      const next = new Set(prev)
      if (next.has(slotId)) {
        next.delete(slotId)
      } else {
        next.add(slotId)
        const slot = (bracketByRound[bracketRound] ?? []).find(b => b.id === slotId)
        if (slot) {
          setOverrideInputs(prevInp => ({
            ...prevInp,
            [slotId]: {
              home: prevInp[slotId]?.home ?? slot.homeTeam ?? '',
              away: prevInp[slotId]?.away ?? slot.awayTeam ?? '',
            },
          }))
        }
      }
      return next
    })
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
          <button className={`${s.tab} ${tab === 'wrapped' ? s.tabActive : ''}`} onClick={() => setTab('wrapped')}>
            Wrapped
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
              <div className={s.searchRow}>
                <Search size={14} className={s.searchIcon} />
                <input
                  className={s.searchInput}
                  placeholder="Buscar por país..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className={s.searchClear} onClick={() => setSearchQuery('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className={s.matchCount}>{filtered.length} {filtered.length === 1 ? 'partida' : 'partidas'}</div>

            <div className={s.matchList}>
              {filtered.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  isExpanded={expandedId === m.id}
                  onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  onMatchUpdate={(updates) => updateMatch(m.id, updates)}
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

            {/* Round sub-tabs */}
            <div className={s.bracketRoundTabs}>
              {ROUND_ORDER.map(r => (
                <button
                  key={r}
                  className={`${s.bracketRoundTab} ${bracketRound === r ? s.bracketRoundTabActive : ''} ${r === 'final' ? s.bracketRoundTabFinal : ''}`}
                  onClick={() => setBracketRound(r)}
                >
                  {ROUND_LABELS[r]}
                </button>
              ))}
            </div>

            {/* Botão de inicializar — só aparece se não há NENHUM slot no banco */}
            {bracket.length === 0 && (
              <div className={s.initBanner}>
                <div className={s.initBannerText}>
                  <Trophy size={18} />
                  <span>Inicialize o chaveamento para liberar todos os confrontos de todas as fases.</span>
                </div>
                <button className={`btn btn-primary ${s.initBannerBtn}`} onClick={initializeSlots} disabled={initializing}>
                  <Zap size={14} /> {initializing ? 'Criando...' : 'Inicializar Chaveamento'}
                </button>
              </div>
            )}

            {/* Slots do round selecionado */}
            <div className={s.bracketRound}>
              <div className={s.roundTitle}>{ROUND_LABELS[bracketRound]}</div>
              {(() => {
                const realSlots = (bracketByRound[bracketRound] ?? []).sort((a, b) => a.slotNumber - b.slotNumber)
                const count = ROUND_SLOT_COUNT[bracketRound] ?? 1
                const slotsToShow: BracketSlot[] = realSlots.length > 0
                  ? realSlots
                  : Array.from({ length: count }, (_, i) => ({
                      id: `placeholder-${bracketRound}-${i + 1}`,
                      round: bracketRound,
                      slotNumber: i + 1,
                      homeDesc: 'A definir',
                      awayDesc: 'A definir',
                      homeTeam: null,
                      awayTeam: null,
                      winnerTeam: null,
                      matchId: null,
                    }))
                return slotsToShow.map(slot => {
                  const isPlaceholder = slot.id.startsWith('placeholder-')
                  const showOverride = !isPlaceholder && (overrideOpen.has(slot.id) || !slot.homeTeam || !slot.awayTeam)
                  const ovr = overrideInputs[slot.id]
                  const linkedMatch = matches.find(m => m.id === slot.matchId)
                  const slotDate = slotDates[slot.id] ?? (linkedMatch ? toDatetimeLocal(linkedMatch.matchDate) : '')
                  const isCreating = creatingMatch.has(slot.id)

                  return (
                    <div key={slot.id} className={`${s.slotCard} ${slot.winnerTeam ? s.slotDone : ''} ${isPlaceholder ? s.slotPlaceholder : ''}`}>
                      <div className={s.slotHeader}>
                        <span className={s.slotNum}>#{slot.slotNumber}</span>
                        <div className={s.slotHeaderActions}>
                          {!isPlaceholder && slot.matchId && (
                            <span className={s.matchLinkedBadge}><Check size={11} /> Partida criada</span>
                          )}
                          {!isPlaceholder && slot.winnerTeam && <span className={s.winnerBadge}><Trophy size={12} /> {slot.winnerTeam}</span>}
                          {!isPlaceholder && (
                            <button
                              className={s.slotEditBtn}
                              onClick={() => toggleOverride(slot.id)}
                              title={overrideOpen.has(slot.id) ? 'Fechar edição' : 'Editar times'}
                            >
                              {overrideOpen.has(slot.id) ? <X size={11} /> : <Pencil size={11} />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className={s.slotTeams}>
                        <span className={`${s.slotTeam} ${slot.winnerTeam === slot.homeTeam ? s.slotWinner : ''} ${slot.winnerTeam && slot.winnerTeam !== slot.homeTeam ? s.slotLoser : ''}`}>
                          {slot.homeTeam ?? <span className={s.slotTbd}>{slot.homeDesc}</span>}
                        </span>
                        <span className={s.slotVs}>vs</span>
                        <span className={`${s.slotTeam} ${slot.winnerTeam === slot.awayTeam ? s.slotWinner : ''} ${slot.winnerTeam && slot.winnerTeam !== slot.awayTeam ? s.slotLoser : ''}`}>
                          {slot.awayTeam ?? <span className={s.slotTbd}>{slot.awayDesc}</span>}
                        </span>
                      </div>

                      {/* Override team names */}
                      {showOverride && (
                        <div className={s.overrideForm}>
                          <div className={s.overrideLabel}>Mandante</div>
                          <TeamSearchInput
                            value={ovr?.home ?? slot.homeTeam ?? ''}
                            onChange={v => setOverrideInputs(prev => ({
                              ...prev,
                              [slot.id]: { home: v, away: prev[slot.id]?.away ?? slot.awayTeam ?? '' },
                            }))}
                            placeholder={slot.homeDesc || 'Buscar mandante...'}
                          />
                          <div className={s.overrideLabel}>Visitante</div>
                          <TeamSearchInput
                            value={ovr?.away ?? slot.awayTeam ?? ''}
                            onChange={v => setOverrideInputs(prev => ({
                              ...prev,
                              [slot.id]: { home: prev[slot.id]?.home ?? slot.homeTeam ?? '', away: v },
                            }))}
                            placeholder={slot.awayDesc || 'Buscar visitante...'}
                          />
                          <button
                            className={s.overrideSaveBtn}
                            onClick={() => saveOverrideTeams(slot.id)}
                          >
                            <Check size={13} /> Confirmar times
                          </button>
                        </div>
                      )}

                      {/* Resetar slot */}
                      {!isPlaceholder && (slot.matchId || slot.homeTeam || slot.awayTeam || slot.winnerTeam) && (
                        <button
                          className={s.unlinkBtn}
                          onClick={() => setConfirm({
                            title: slot.matchId ? 'Desvincular partida' : 'Limpar slot',
                            matchLabel: `Slot #${slot.slotNumber} — ${slot.homeTeam ?? 'A definir'} vs ${slot.awayTeam ?? 'A definir'}`,
                            consequences: [
                              ...(slot.matchId ? ['A partida será removida da aba Partidas', 'Palpites feitos nesta partida serão apagados'] : []),
                              'Times e vencedor do slot serão apagados',
                              'O slot volta para "A definir" e pode ser reconfigurado',
                            ],
                            action: async () => {
                              try {
                                const removedMatchId = slot.matchId
                                await adminUnlinkMatchFromSlot(slot.id)
                                // Optimistic: clear slot immediately
                                updateSlot(slot.id, { matchId: null, homeTeam: null, awayTeam: null, winnerTeam: null })
                                // Remove the linked match from the matches list
                                if (removedMatchId) {
                                  setMatches(prev => prev.filter(m => m.id !== removedMatchId))
                                }
                                setBracketMsg({ type: 'ok', text: 'Partida desvinculada! Slot voltou para "A definir".' })
                                load(true)  // background sync
                              } catch (e) {
                                setBracketMsg({ type: 'err', text: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao desvincular partida.' })
                              }
                            },
                          })}
                        >
                          <X size={11} /> {slot.matchId ? 'Desvincular partida' : 'Limpar slot'}
                        </button>
                      )}

                      {/* Match date + create/update */}
                      {isPlaceholder && (
                        <div className={s.slotPending}>Inicialize o chaveamento para editar este confronto</div>
                      )}
                      {!isPlaceholder && <div className={s.slotMatchRow}>
                        <Calendar size={12} className={s.slotMatchIcon} />
                        <input
                          className={s.slotDateInput}
                          type="datetime-local"
                          value={slotDate}
                          onChange={e => setSlotDates(prev => ({ ...prev, [slot.id]: e.target.value }))}
                        />
                        <span className={s.slotDateTz}>BRT</span>
                        <button
                          className={`${s.winnerBtn} ${slot.matchId ? s.winnerBtnUpdate : ''}`}
                          onClick={async () => {
                            if (!slotDate) return
                            setCreatingMatch(prev => new Set([...prev, slot.id]))
                            setBracketMsg(null)
                            try {
                              await adminCreateMatchFromSlot(slot.id, fromDatetimeLocal(slotDate))
                              setBracketMsg({ type: 'ok', text: slot.matchId ? 'Partida atualizada!' : 'Partida criada com sucesso!' })
                              await load(true)  // must await — need the new match ID to update the slot badge and partidas list
                            } catch (e) {
                              setBracketMsg({ type: 'err', text: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao criar partida' })
                            } finally {
                              setCreatingMatch(prev => { const ns = new Set(prev); ns.delete(slot.id); return ns })
                            }
                          }}
                          disabled={!slotDate || isCreating || !slot.homeTeam || !slot.awayTeam}
                          title={!slot.homeTeam || !slot.awayTeam ? 'Defina os times primeiro' : slot.matchId ? 'Atualizar data da partida' : 'Criar partida'}
                        >
                          {isCreating ? <RefreshCw size={12} className={s.spin} /> : <Check size={12} />}
                        </button>
                      </div>}

                      {!isPlaceholder && slot.winnerTeam && (
                        <div className={s.winnerAutoNote}>
                          <Trophy size={11} /> Vencedor definido automaticamente ao finalizar a partida
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          </>
        )}

        {/* ══ CRAVOU WRAPPED ═══════════════════════════════════════ */}
        {tab === 'wrapped' && (
          <div className={s.wrappedPanel}>
            <div className={s.wrappedIcon}><Sparkles size={22} /></div>
            <div className={s.wrappedTitle}>Retrospectiva Cravou 2026</div>
            <div className={s.wrappedSub}>
              Ative só pra você testar o fluxo inteiro antes de liberar pra todo mundo.
            </div>

            <div className={s.wrappedStatus}>
              Estado atual:{' '}
              <b>
                {wrappedLoading && !wrappedRaw
                  ? 'carregando...'
                  : wrappedRaw?.status === 'released'
                    ? 'Liberado pra todo mundo'
                    : wrappedRaw?.status === 'preview'
                      ? 'Prévia ativa (só a sua conta)'
                      : 'Desativado'}
              </b>
            </div>

            <div className={s.wrappedActions}>
              <button className={s.wrappedBtnPreview} onClick={activatePreview} disabled={wrappedLoading}>
                <Eye size={16} /> Ativar prévia (só eu)
              </button>
              <button className={s.wrappedBtnRelease} onClick={confirmRelease} disabled={wrappedLoading}>
                <Sparkles size={16} /> Liberar pra todo mundo
              </button>
              <button className={s.wrappedBtnOff} onClick={deactivateWrapped} disabled={wrappedLoading}>
                <Ban size={16} /> Desativar
              </button>
            </div>

            {wrappedMsg && (
              <div className={`${s.wrappedMsg} ${wrappedMsg.type === 'ok' ? s.wrappedMsgOk : s.wrappedMsgErr}`}>
                {wrappedMsg.text}
              </div>
            )}
          </div>
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
  onMatchUpdate: (updates: Partial<Match>) => void
  onReload: () => void
  onToast: (type: 'ok' | 'err', text: string) => void
  onConfirm: (c: ConfirmState) => void
}

function MatchCard({ match: m, isExpanded, onToggle, onMatchUpdate, onReload, onToast, onConfirm }: MatchCardProps) {
  const [editHome, setEditHome] = useState(m.homeScore !== null ? String(m.homeScore) : '')
  const [editAway, setEditAway] = useState(m.awayScore !== null ? String(m.awayScore) : '')
  const [editStatus, setEditStatus] = useState(m.status)
  const [editDate, setEditDate] = useState(toDatetimeLocal(m.matchDate))
  const [penaltyWinner, setPenaltyWinner] = useState(m.penaltyWinner ?? '')
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [savingDate, setSavingDate] = useState(false)

  // Sync form state if match prop changes (after optimistic update)
  useEffect(() => {
    setEditHome(m.homeScore !== null ? String(m.homeScore) : '')
    setEditAway(m.awayScore !== null ? String(m.awayScore) : '')
    setEditStatus(m.status)
    setEditDate(toDatetimeLocal(m.matchDate))
    setPenaltyWinner(m.penaltyWinner ?? '')
  }, [m.homeScore, m.awayScore, m.status, m.matchDate, m.penaltyWinner])

  const isKnockout = m.phase !== 'group_stage'
  const h = parseInt(editHome)
  const a = parseInt(editAway)
  const isTied = !isNaN(h) && !isNaN(a) && h === a

  async function doFinalize() {
    const hv = parseInt(editHome), av = parseInt(editAway)
    if (isNaN(hv) || isNaN(av) || hv < 0 || av < 0) { onToast('err', 'Informe um placar válido.'); return }
    if (isKnockout && hv === av && !penaltyWinner) {
      onToast('err', 'Empate em mata-mata: selecione quem se classifica.')
      return
    }
    setFinalizing(true)
    try {
      await adminFinalizeMatch(m.id, hv, av, isKnockout && hv === av ? penaltyWinner : undefined)
      onToast('ok', `Resultado: ${m.homeTeam} ${hv}×${av} ${m.awayTeam} — pontos calculados!`)
      onToggle()  // close edit panel
      onMatchUpdate({
        homeScore: hv,
        awayScore: av,
        status: 'finished',
        predictionsLocked: true,
        penaltyWinner: isKnockout && hv === av ? penaltyWinner : null,
      })
      onReload()  // background sync
    } catch { onToast('err', 'Erro ao finalizar partida.') }
    finally { setFinalizing(false) }
  }

  async function doSaveScore() {
    const hv = parseInt(editHome), av = parseInt(editAway)
    if (isNaN(hv) || isNaN(av) || hv < 0 || av < 0) { onToast('err', 'Placar inválido.'); return }
    setSaving(true)
    try {
      await adminUpdateScore(m.id, hv, av)
      onToast('ok', 'Placar atualizado!')
      onMatchUpdate({ homeScore: hv, awayScore: av })
      onReload()
    } catch { onToast('err', 'Erro ao salvar placar.') }
    finally { setSaving(false) }
  }

  async function doSaveStatus() {
    if (editStatus === m.status) return
    setSaving(true)
    try {
      await adminUpdateStatus(m.id, editStatus)
      onToast('ok', `Status: ${statusLabel(editStatus)}`)
      onMatchUpdate({ status: editStatus })
      onReload()
    } catch { onToast('err', 'Erro ao atualizar status.') }
    finally { setSaving(false) }
  }

  async function doSaveDate() {
    if (!editDate) return
    setSavingDate(true)
    try {
      const isoDate = fromDatetimeLocal(editDate)
      await adminUpdateDate(m.id, isoDate)
      onToast('ok', 'Data atualizada! Cron ajusta status em até 1 min.')
      onMatchUpdate({ matchDate: isoDate })
      onReload()
    } catch { onToast('err', 'Erro ao atualizar data.') }
    finally { setSavingDate(false) }
  }

  async function doReprocess() {
    try {
      await adminReprocessMatch(m.id)
      onToast('ok', 'Pontuações reprocessadas!')
      onReload()
    } catch { onToast('err', 'Erro ao reprocessar.') }
  }

  async function doLock() {
    try {
      await adminLockMatch(m.id)
      onToast('ok', 'Palpites bloqueados!')
      onMatchUpdate({ predictionsLocked: true })
      onReload()
    } catch { onToast('err', 'Erro ao bloquear.') }
  }

  async function doUnlock() {
    try {
      await adminUnlockMatch(m.id)
      onToast('ok', 'Palpites desbloqueados!')
      onMatchUpdate({ predictionsLocked: false })
      onReload()
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
          onMatchUpdate({
            homeScore: null,
            awayScore: null,
            penaltyWinner: null,
            status: inFuture ? 'upcoming' : 'awaiting_result',
            predictionsLocked: false,
          })
          onReload()
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

            {isKnockout && isTied && (
              <div className={s.penaltyRow}>
                <div className={s.penaltyLabel}><Zap size={11} /> Pênaltis — quem venceu?</div>
                <select
                  className={s.penaltySelect}
                  value={penaltyWinner}
                  onChange={e => setPenaltyWinner(e.target.value)}
                >
                  <option value="">Selecionar vencedor nos pênaltis…</option>
                  <option value={m.homeTeam}>{m.homeTeam}</option>
                  <option value={m.awayTeam}>{m.awayTeam}</option>
                </select>
              </div>
            )}

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
              <span className={s.dateTzLabel}>BRT</span>
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
