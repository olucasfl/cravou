import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Crown, Search, UserPlus, LogOut, Trash2, X, Trophy, TrendingUp, Users, Target, Pencil, Clock, UserCheck } from 'lucide-react'
import {
  getBolaoGroupDetail,
  leaveBolaoGroup,
  removeBolaoMember,
  searchBolaoUsers,
  sendBolaoInvite,
  editBolaoGroup,
  deleteBolaoGroup,
  type GroupDetail,
  type GroupRankingEntry,
  type UserSearchResult,
} from '@/services/bolaoService'
import r from '@/pages/Ranking/Ranking.module.css'
import s from './BolaoDetail.module.css'

type Tab = 'ranking' | 'membros' | 'stats'

function getMyId(): string | null {
  const token = localStorage.getItem('access_token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub as string
  } catch {
    return null
  }
}

export default function BolaoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const myId = useMemo(() => getMyId(), [])

  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [tab, setTab] = useState<Tab>('ranking')
  const [rankTab, setRankTab] = useState<'pontos' | 'cravadas'>('pontos')
  const [loading, setLoading] = useState(true)
  const [codeCopied, setCodeCopied] = useState(false)
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    let active = true
    async function init() {
      if (!id) return
      try {
        const data = await getBolaoGroupDetail(id)
        if (active) setDetail(data)
      } catch { if (active) navigate('/bolao') }
      finally  { if (active) setLoading(false) }
    }
    init()
    return () => { active = false }
  }, [id, navigate])

  const group = detail?.group
  const ranking = useMemo(() => detail?.ranking ?? [], [detail])
  const isOwner = group?.ownerId === myId

  const rankingCravas = useMemo(() =>
    [...ranking]
      .sort((a, b) => b.cravadas - a.cravadas || b.points - a.points)
      .map((e, i) => ({ ...e, position: i + 1 })),
    [ranking]
  )
  const isCravas = rankTab === 'cravadas'
  const activeRanking = isCravas ? rankingCravas : ranking
  const top3 = activeRanking.slice(0, 3)
  const listRest = activeRanking.slice(3)

  async function handleCopyCode() {
    if (!group) return
    await navigator.clipboard.writeText(group.inviteCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  async function handleLeave() {
    if (!id || !confirm('Tem certeza que deseja sair do grupo?')) return
    setLeaveLoading(true)
    try {
      await leaveBolaoGroup(id)
      navigate('/bolao')
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message ?? 'Erro ao sair do grupo')
      setLeaveLoading(false)
    }
  }

  async function handleDelete() {
    if (!id || !group) return
    if (!confirm(`Excluir o grupo "${group.name}"? Esta ação não pode ser desfeita.`)) return
    setDeleteLoading(true)
    try {
      await deleteBolaoGroup(id)
      navigate('/bolao')
    } catch {
      setDeleteLoading(false)
    }
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!id || !confirm(`Remover ${name} do grupo?`)) return
    try {
      await removeBolaoMember(id, userId)
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              group: { ...prev.group, memberCount: prev.group.memberCount - 1 },
              ranking: prev.ranking.filter((r) => r.userId !== userId),
            }
          : prev
      )
    } catch { void 0 }
  }

  if (loading) {
    return (
      <div className="app-layout">
        <div className="page fade-up">
          <div className={s.loadingText}>Carregando...</div>
        </div>
      </div>
    )
  }

  if (!group) return null

  return (
    <div className="app-layout">
      <div className="page fade-up">
        {/* Header */}
        <div className={s.header}>
          <button className={s.backBtn} onClick={() => navigate('/bolao')}>
            <ArrowLeft size={20} />
          </button>
          <div className={s.headerInfo}>
            <h1 className={s.groupName}>{group.name}</h1>
            {group.description && <p className={s.groupDesc}>{group.description}</p>}
          </div>
          {isOwner && (
            <div className={s.headerActions}>
              <button className={s.iconBtn} onClick={() => setShowEditModal(true)} title="Editar grupo">
                <Pencil size={17} />
              </button>
              <button className={s.inviteBtn} onClick={() => setShowInvitePanel(true)} title="Convidar membros">
                <UserPlus size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Invite Code (owner) */}
        {isOwner && (
          <button className={s.codeBar} onClick={handleCopyCode}>
            <span className={s.codeLabel}>Código do grupo</span>
            <span className={s.codeValue}>{group.inviteCode}</span>
            <span className={s.codeCopy}>
              {codeCopied ? <Check size={14} /> : <Copy size={14} />}
              {codeCopied ? 'Copiado!' : 'Copiar'}
            </span>
          </button>
        )}

        {/* Brasil Edition banner */}
        {group.brazilOnly && (
          <div className={s.brazilBanner}>
            <span className={s.brazilBannerFlag}>🇧🇷</span>
            <div className={s.brazilBannerText}>
              <span className={s.brazilBannerTitle}>Brasil Edition</span>
              <span className={s.brazilBannerSub}>Apenas os jogos do Brasil contam neste bolão</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={s.tabs}>
          {(['ranking', 'membros', 'stats'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`${s.tab} ${tab === t ? s.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Ranking Tab ── */}
        {tab === 'ranking' && (
          <>
            {/* Sub-tabs pontos / cravadas */}
            <div className={r.tabs}>
              <button
                className={`${r.tab} ${!isCravas ? r.tabActive : ''}`}
                onClick={() => setRankTab('pontos')}
              >
                <Trophy size={14} /> Pontos
              </button>
              <button
                className={`${r.tab} ${isCravas ? r.tabActiveCravas : ''}`}
                onClick={() => setRankTab('cravadas')}
              >
                <Target size={14} /> Cravadas
              </button>
            </div>

            {ranking.length === 0 && (
              <div className={r.empty}>
                <div className={r.emptyIcon}><Trophy size={40} /></div>
                <div className={r.emptyTitle}>Nenhum palpite pontuado ainda</div>
                <div className={r.emptySub}>O ranking aparecerá quando as partidas forem encerradas</div>
              </div>
            )}

            {activeRanking.length >= 3 && (
              <div className={r.podium}>
                {[1, 0, 2].map((idx) => {
                  const e = top3[idx]
                  if (!e) return null
                  const cls = idx === 0 ? r.first : idx === 1 ? r.second : r.third
                  return (
                    <div key={e.userId} className={`${r.podiumItem} ${cls}`}>
                      {idx === 0 && (
                        <div className={r.podiumCrown}>
                          {isCravas
                            ? <Target size={18} color="var(--c-accent)" />
                            : <Crown size={18} color="var(--c-gold)" />
                          }
                        </div>
                      )}
                      <div className={`${r.podiumAvatar} ${idx === 0 && isCravas ? r.firstCravas : ''}`}>
                        {e.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={r.podiumName}>{e.name}{e.userId === myId ? ' (você)' : ''}</div>
                      <div className={`${r.podiumPts} ${idx === 0 && isCravas ? r.podiumPtsCravas : ''}`}>
                        {isCravas ? e.cravadas : e.points}
                      </div>
                      <div className={r.podiumPtsLabel}>{isCravas ? 'cravadas' : 'pts'}</div>
                      <div className={`${r.podiumBar} ${idx === 0 && isCravas ? r.podiumBarCravas : ''}`} />
                    </div>
                  )
                })}
              </div>
            )}

            {activeRanking.length > 0 && (
              <div className={r.list}>
                {(activeRanking.length < 3 ? activeRanking : listRest).map((e) => (
                  <div key={e.userId} className={`${r.item} ${e.userId === myId ? (isCravas ? r.meCravas : r.me) : ''}`}>
                    <div className={r.pos}>#{e.position}</div>
                    <div className={r.avatar}>{e.name.slice(0, 2).toUpperCase()}</div>
                    <div className={r.name}>{e.name}{e.userId === myId ? ' (você)' : ''}</div>
                    <div className={r.ptsBlock}>
                      <div className={`${r.pts} ${isCravas ? r.ptsCravas : ''}`}>
                        {isCravas ? e.cravadas : e.points}
                      </div>
                      <div className={r.ptsLabel}>{isCravas ? 'cravadas' : 'pts'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Membros Tab ── */}
        {tab === 'membros' && (
          <div className={s.memberList}>
            {ranking.map((entry) => (
              <div key={entry.userId} className={`${s.memberRow} ${entry.userId === myId ? s.memberMe : ''}`}>
                <div className={s.memberAvatar}>{entry.name.charAt(0).toUpperCase()}</div>
                <div className={s.memberInfo}>
                  <div className={s.memberName}>
                    {entry.name}
                    {entry.userId === group.ownerId && <span className={s.ownerBadge}>Dono</span>}
                    {entry.userId === myId && <span className={s.meBadge}>Você</span>}
                  </div>
                  <div className={s.memberStats}>
                    {entry.points} pts · {entry.cravadas} cravada{entry.cravadas !== 1 ? 's' : ''}
                  </div>
                </div>
                {isOwner && entry.userId !== myId && (
                  <button
                    className={s.removeBtn}
                    onClick={() => handleRemoveMember(entry.userId, entry.name)}
                    title="Remover membro"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}

            {!isOwner && (
              <button className={s.leaveBtn} onClick={handleLeave} disabled={leaveLoading}>
                <LogOut size={15} />
                {leaveLoading ? 'Saindo...' : 'Sair do grupo'}
              </button>
            )}
            {isOwner && (
              <button className={s.deleteBtn} onClick={handleDelete} disabled={deleteLoading}>
                <Trash2 size={15} />
                {deleteLoading ? 'Excluindo...' : 'Excluir grupo'}
              </button>
            )}
          </div>
        )}

        {/* ── Stats Tab ── */}
        {tab === 'stats' && <StatsTab ranking={ranking} memberCount={group.memberCount} />}
      </div>

      {/* ── Invite Panel ── */}
      {showInvitePanel && id && (
        <InvitePanel groupId={id} onClose={() => setShowInvitePanel(false)} />
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && id && group && (
        <EditGroupModal
          groupId={id}
          initialName={group.name}
          initialDescription={group.description ?? ''}
          onClose={() => setShowEditModal(false)}
          onSaved={(name, description) => {
            setDetail((prev) => prev ? { ...prev, group: { ...prev.group, name, description: description || null } } : prev)
            setShowEditModal(false)
          }}
        />
      )}
    </div>
  )
}

// ── Stats Tab ──────────────────────────────────────────────────────────────────

function StatsTab({ ranking, memberCount }: { ranking: GroupRankingEntry[]; memberCount: number }) {
  const totalPoints = useMemo(() => ranking.reduce((sum, r) => sum + r.points, 0), [ranking])
  const avgPoints = memberCount > 0 ? Math.round(totalPoints / memberCount) : 0
  const topCravadas = useMemo(() =>
    [...ranking].sort((a, b) => b.cravadas - a.cravadas)[0],
    [ranking]
  )
  const leader = ranking[0]
  const lastPlace = ranking[ranking.length - 1]

  return (
    <div className={s.statsList}>
      {leader && (
        <StatCard
          icon={<Trophy size={22} color="#f59e0b" />}
          title="Líder do Bolão"
          value={leader.name.split(' ')[0]}
          sub={`${leader.points} pts`}
          accent="gold"
        />
      )}
      {topCravadas && topCravadas.cravadas > 0 && (
        <StatCard
          icon={<Target size={22} color="#00D4FF" />}
          title="Rei das Cravadas"
          value={topCravadas.name.split(' ')[0]}
          sub={`${topCravadas.cravadas} acerto${topCravadas.cravadas !== 1 ? 's' : ''} exato${topCravadas.cravadas !== 1 ? 's' : ''}`}
          accent="accent"
        />
      )}
      <StatCard
        icon={<TrendingUp size={22} color="#22c55e" />}
        title="Média do Grupo"
        value={`${avgPoints} pts`}
        sub={`${totalPoints} pts no total`}
        accent="green"
      />
      <StatCard
        icon={<Users size={22} color="#8FA3C0" />}
        title="Tamanho do Bolão"
        value={`${memberCount} membros`}
        sub={ranking.length > 0 ? `${ranking.filter(r => r.points > 0).length} já pontuaram` : 'Aguardando jogos'}
        accent="neutral"
      />
      {lastPlace && lastPlace.userId !== leader?.userId && (
        <StatCard
          icon={<TrendingUp size={22} color="var(--c-text-3)" style={{ transform: 'rotate(180deg)' }} />}
          title="Lanterna"
          value={lastPlace.name.split(' ')[0]}
          sub={`${lastPlace.points} pts`}
          accent="neutral"
        />
      )}
    </div>
  )
}

function StatCard({
  icon,
  title,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  title: string
  value: string
  sub: string
  accent: 'gold' | 'accent' | 'green' | 'neutral'
}) {
  return (
    <div className={`${s.statCard} ${s[`statCard_${accent}`]}`}>
      <div className={s.statIcon}>{icon}</div>
      <div className={s.statBody}>
        <div className={s.statTitle}>{title}</div>
        <div className={s.statValue}>{value}</div>
        <div className={s.statSub}>{sub}</div>
      </div>
    </div>
  )
}

// ── Edit Group Modal ───────────────────────────────────────────────────────────

function EditGroupModal({
  groupId,
  initialName,
  initialDescription,
  onClose,
  onSaved,
}: {
  groupId: string
  initialName: string
  initialDescription: string
  onClose: () => void
  onSaved: (name: string, description: string) => void
}) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (name.trim().length < 3) { setError('O nome precisa ter ao menos 3 caracteres'); return }
    setLoading(true)
    setError('')
    try {
      await editBolaoGroup(groupId, name.trim(), description.trim() || undefined)
      onSaved(name.trim(), description.trim())
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Erro ao salvar')
      setLoading(false)
    }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.panel} onClick={(e) => e.stopPropagation()} style={{ maxHeight: 'none' }}>
        <div className={s.panelHeader}>
          <h2 className={s.panelTitle}>Editar Grupo</h2>
          <button className={s.panelClose} onClick={onClose}><X size={20} /></button>
        </div>
        <div className={s.editBody}>
          <label className={s.fieldLabel}>Nome do grupo *</label>
          <input
            className={s.fieldInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            autoFocus
          />
          <label className={s.fieldLabel}>Descrição (opcional)</label>
          <input
            className={s.fieldInput}
            placeholder="Ex: Copa do Mundo 2026"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
          />
          {error && <div className={s.fieldError}>{error}</div>}
        </div>
        <div className={s.editFooter}>
          <button className={s.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={s.btnSave} onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Invite Panel ───────────────────────────────────────────────────────────────

function InvitePanel({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  // Mapa local de overrides de status (após convite enviado na sessão)
  const [statusOverride, setStatusOverride] = useState<Map<string, UserSearchResult['status']>>(new Map())
  const [sending, setSending] = useState<Set<string>>(new Set())
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    if (query.trim().length < 2) return
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchBolaoUsers(query.trim(), groupId)
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query, groupId])

  // Limpa resultados quando query fica curta (sem setState no effect)
  const displayResults = query.trim().length >= 2 ? results : []

  async function handleInvite(user: UserSearchResult) {
    setInviteError('')
    setSending((prev) => new Set(prev).add(user.id))
    try {
      await sendBolaoInvite(groupId, user.id)
      setStatusOverride((prev) => new Map(prev).set(user.id, 'pending'))
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setInviteError(err.response?.data?.message ?? 'Erro ao enviar convite')
    } finally {
      setSending((prev) => { const s = new Set(prev); s.delete(user.id); return s })
    }
  }

  function getStatus(u: UserSearchResult): UserSearchResult['status'] {
    return statusOverride.get(u.id) ?? u.status
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.panel} onClick={(e) => e.stopPropagation()}>
        <div className={s.panelHeader}>
          <h2 className={s.panelTitle}>Convidar Membros</h2>
          <button className={s.panelClose} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={s.searchWrap}>
          <Search size={15} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Buscar por nome..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {inviteError && <div className={s.inviteErr}>{inviteError}</div>}

        <div className={s.searchResults}>
          {searching && <div className={s.searchHint}>Buscando...</div>}
          {!searching && query.trim().length >= 2 && displayResults.length === 0 && (
            <div className={s.searchHint}>Nenhum usuário encontrado</div>
          )}
          {!searching && query.trim().length < 2 && (
            <div className={s.searchHint}>Digite ao menos 2 caracteres para buscar</div>
          )}
          {displayResults.map((u) => {
            const status = getStatus(u)
            const isSending = sending.has(u.id)
            return (
              <div key={u.id} className={s.searchRow}>
                <div className={s.searchAvatar}>{u.name.charAt(0).toUpperCase()}</div>
                <div className={s.searchUserInfo}>
                  <span className={s.searchName}>{u.name}</span>
                  {status === 'member' && (
                    <span className={s.searchStatusMember}>Já no grupo</span>
                  )}
                  {status === 'pending' && (
                    <span className={s.searchStatusPending}>Convite pendente</span>
                  )}
                </div>

                {status === 'member' && (
                  <span className={s.inviteTagMember}><UserCheck size={12} /> Membro</span>
                )}
                {status === 'pending' && (
                  <span className={s.inviteTagPending}><Clock size={12} /> Aguardando</span>
                )}
                {status === 'available' && (
                  <button
                    className={`${s.inviteSendBtn} ${isSending ? s.inviteLoading : ''}`}
                    onClick={() => !isSending && handleInvite(u)}
                    disabled={isSending}
                  >
                    {isSending
                      ? <span className={s.spinner} />
                      : <><UserPlus size={13} /> Convidar</>
                    }
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
