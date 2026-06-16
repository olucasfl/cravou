import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Trophy, ChevronRight, Check, X, Hash, UserPlus } from 'lucide-react'
import {
  getMyBolaoGroups,
  createBolaoGroup,
  getPendingInvites,
  respondToInvite,
  joinBolaoGroup,
  type BolaoGroup,
  type PendingInvite,
} from '@/services/bolaoService'
import { getCache, clearCache } from '@/utils/cache'
import { usePendingInviteCount } from '@/hooks/usePendingInviteCount'
import PullToRefresh from '@/components/PullToRefresh/PullToRefresh'
import s from './Bolao.module.css'

type Tab = 'grupos' | 'convites'

export default function Bolao() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('grupos')
  const [groups, setGroups] = useState<BolaoGroup[]>(
    () => getCache<BolaoGroup[]>('myBolaoGroups', 60_000) ?? []
  )
  const [invites, setInvites] = useState<PendingInvite[]>(
    () => getCache<PendingInvite[]>('pendingInvites', 60_000) ?? []
  )
  const [loading, setLoading] = useState(
    () => !getCache<BolaoGroup[]>('myBolaoGroups', 60_000)
  )
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')
  const { count: pendingCount, refresh: refreshBadge } = usePendingInviteCount()

  const loadGroups = useCallback(async () => {
    const data = await getMyBolaoGroups().catch(() => [])
    setGroups(data)
    setLoading(false)
  }, [])

  const loadInvites = useCallback(async () => {
    const data = await getPendingInvites().catch(() => [])
    setInvites(data)
  }, [])

  useEffect(() => {
    async function init() {
      await Promise.all([loadGroups(), loadInvites()])
    }
    init()
  }, [loadGroups, loadInvites])

  const handleRefresh = useCallback(async () => {
    clearCache('myBolaoGroups', 'pendingInvites')
    await Promise.all([loadGroups(), loadInvites()])
  }, [loadGroups, loadInvites])

  async function handleRespond(inviteId: string, status: 'accepted' | 'declined') {
    try {
      const res = await respondToInvite(inviteId, status)
      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
      clearCache('pendingInvites')
      refreshBadge()
      if (status === 'accepted' && res.groupId) {
        clearCache('myBolaoGroups')
        await loadGroups()
        navigate(`/bolao/${res.groupId}`)
      }
    } catch {}
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setJoinLoading(true)
    setJoinError('')
    try {
      const res = await joinBolaoGroup(joinCode.trim().toUpperCase())
      setJoinCode('')
      clearCache('myBolaoGroups')
      await loadGroups()
      navigate(`/bolao/${res.groupId}`)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setJoinError(err.response?.data?.message ?? 'Código inválido')
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="app-layout">
        <div className="page fade-up">
          {/* Header */}
          <div className={s.header}>
            <h1 className={s.title}>Meus Bolões</h1>
            <button className={s.createBtn} onClick={() => setShowCreateModal(true)}>
              <Plus size={18} strokeWidth={2.5} />
              Novo
            </button>
          </div>

          {/* Tabs */}
          <div className={s.tabs}>
            <button
              className={`${s.tab} ${tab === 'grupos' ? s.tabActive : ''}`}
              onClick={() => setTab('grupos')}
            >
              <Users size={14} />
              Grupos
            </button>
            <button
              className={`${s.tab} ${tab === 'convites' ? s.tabActive : ''}`}
              onClick={() => setTab('convites')}
            >
              <UserPlus size={14} />
              Convites
              {pendingCount > 0 && <span className={s.tabBadge}>{pendingCount}</span>}
            </button>
          </div>

          {/* ── Meus Grupos ── */}
          {tab === 'grupos' && (
            <div className={s.groupList}>
              {loading ? (
                <div className={s.empty}>Carregando...</div>
              ) : groups.length === 0 ? (
                <div className={s.emptyState}>
                  <Trophy size={40} className={s.emptyIcon} />
                  <p>Você ainda não faz parte de nenhum bolão</p>
                  <p className={s.emptyHint}>Crie um grupo ou entre com um código</p>
                </div>
              ) : (
                groups.map((g) => (
                  <button key={g.id} className={s.groupCard} onClick={() => navigate(`/bolao/${g.id}`)}>
                    <div className={s.groupCardLeft}>
                      <div className={s.groupNameRow}>
                        <div className={s.groupName}>{g.name}</div>
                        {g.brazilOnly && <span className={s.brazilBadge}>🇧🇷 Brasil Edition</span>}
                      </div>
                      {g.description && <div className={s.groupDesc}>{g.description}</div>}
                      <div className={s.groupMeta}>
                        <span><Users size={12} /> {g.memberCount} membros</span>
                      </div>
                    </div>
                    <div className={s.groupCardRight}>
                      <div className={s.groupPoints}>{g.myPoints} <span>pts</span></div>
                      <div className={s.groupPos}>#{g.myPosition}</div>
                      <ChevronRight size={16} className={s.chevron} />
                    </div>
                  </button>
                ))
              )}

              {/* Entrar com código na aba grupos também */}
              <div className={s.joinSection}>
                <div className={s.joinLabel}>Entrar com código</div>
                <div className={s.joinRow}>
                  <div className={s.joinInputWrap}>
                    <Hash size={14} className={s.joinIcon} />
                    <input
                      className={s.joinInput}
                      placeholder="Ex: ABC123"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toLowerCase())}
                      maxLength={250}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    />
                  </div>
                  <button className={s.joinBtn} onClick={handleJoin} disabled={joinLoading || !joinCode.trim()}>
                    {joinLoading ? '...' : 'Entrar'}
                  </button>
                </div>
                {joinError && <div className={s.joinError}>{joinError}</div>}
              </div>
            </div>
          )}

          {/* ── Convites ── */}
          {tab === 'convites' && (
            <div className={s.inviteList}>
              {invites.length === 0 ? (
                <div className={s.emptyState}>
                  <UserPlus size={40} className={s.emptyIcon} />
                  <p>Nenhum convite pendente</p>
                </div>
              ) : (
                invites.map((inv) => (
                  <div key={inv.id} className={s.inviteCard}>
                    <div className={s.inviteInfo}>
                      <div className={s.inviteName}>{inv.groupName}</div>
                      <div className={s.inviteMeta}>
                        Convidado por <strong>{inv.inviterName}</strong> · {inv.memberCount} membros
                      </div>
                      {inv.groupDescription && <div className={s.inviteDesc}>{inv.groupDescription}</div>}
                    </div>
                    <div className={s.inviteActions}>
                      <button
                        className={s.btnAccept}
                        onClick={() => handleRespond(inv.id, 'accepted')}
                      >
                        <Check size={15} />
                        Aceitar
                      </button>
                      <button
                        className={s.btnDecline}
                        onClick={() => handleRespond(inv.id, 'declined')}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div className={s.divider} />

              {/* Entrar com código */}
              <div className={s.joinSection}>
                <div className={s.joinLabel}>Entrar com código</div>
                <div className={s.joinRow}>
                  <div className={s.joinInputWrap}>
                    <Hash size={14} className={s.joinIcon} />
                    <input
                      className={s.joinInput}
                      placeholder="Ex: ABC123"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toLowerCase())}
                      maxLength={250}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    />
                  </div>
                  <button className={s.joinBtn} onClick={handleJoin} disabled={joinLoading || !joinCode.trim()}>
                    {joinLoading ? '...' : 'Entrar'}
                  </button>
                </div>
                {joinError && <div className={s.joinError}>{joinError}</div>}
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Criar Grupo ── */}
        {showCreateModal && (
          <CreateGroupModal
            onClose={() => setShowCreateModal(false)}
            onCreate={async (group) => {
              clearCache('myBolaoGroups')
              setGroups((prev) => [group, ...prev])
              setShowCreateModal(false)
              navigate(`/bolao/${group.id}`)
            }}
          />
        )}
      </div>
    </PullToRefresh>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function CreateGroupModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (group: BolaoGroup) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [brazilOnly, setBrazilOnly] = useState(false)
  const [zeroPoints, setZeroPoints] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (name.trim().length < 3) {
      setError('O nome precisa ter ao menos 3 caracteres')
      return
    }
    setLoading(true)
    setError('')
    try {
      const group = await createBolaoGroup(name.trim(), description.trim() || undefined, brazilOnly || undefined, zeroPoints || undefined)
      onCreate(group)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Erro ao criar grupo')
      setLoading(false)
    }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h2 className={s.modalTitle}>Criar Bolão</h2>
          <button className={s.modalClose} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={s.modalBody}>
          <label className={s.fieldLabel}>Nome do grupo *</label>
          <input
            className={s.fieldInput}
            placeholder="Ex: Bolão da Família"
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

          <label className={s.fieldLabel}>Modo do bolão</label>
          <div className={s.modeToggle}>
            <button
              type="button"
              className={`${s.modeBtn} ${!brazilOnly ? s.modeBtnActive : ''}`}
              onClick={() => setBrazilOnly(false)}
            >
              Todos os jogos
            </button>
            <button
              type="button"
              className={`${s.modeBtn} ${brazilOnly ? s.modeBtnBrasil : ''}`}
              onClick={() => setBrazilOnly(true)}
            >
              🇧🇷 Brasil Edition
            </button>
          </div>
          {brazilOnly && (
            <div className={s.modeHint}>
              Apenas os jogos do Brasil contam para o ranking deste bolão
            </div>
          )}

          <div className={s.zeroToggleRow}>
            <div className={s.zeroToggleInfo}>
              <span className={s.zeroToggleLabel}>Pontuação zerada</span>
              <span className={s.zeroToggleHint}>
                Só contam pontos de jogos após a criação do grupo — todo mundo começa do zero, independente do histórico.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={zeroPoints}
              className={`${s.toggleSwitch} ${zeroPoints ? s.toggleSwitchOn : ''}`}
              onClick={() => setZeroPoints((v) => !v)}
            />
          </div>

          {error && <div className={s.fieldError}>{error}</div>}
        </div>

        <div className={s.modalFooter}>
          <button className={s.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={s.btnCreate} onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? 'Criando...' : 'Criar Grupo'}
          </button>
        </div>
      </div>
    </div>
  )
}
