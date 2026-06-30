import api from './api'
import { getCache, setCache, clearCache } from '@/utils/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BolaoGroup {
  id: string
  name: string
  description: string | null
  inviteCode: string
  ownerId: string
  memberCount: number
  myPoints: number
  myPosition: number
  brazilOnly: boolean
  zeroPoints: boolean
}

export interface GroupDetail {
  group: {
    id: string
    name: string
    description: string | null
    inviteCode: string
    ownerId: string
    memberCount: number
    isOwner: boolean
    brazilOnly: boolean
    zeroPoints: boolean
  }
  ranking: GroupRankingEntry[]
}

export interface GroupRankingEntry {
  position: number
  userId: string
  name: string
  points: number
  cravadas: number
}

export interface PendingInvite {
  id: string
  groupId: string
  groupName: string
  groupDescription: string | null
  memberCount: number
  inviterName: string
  createdAt: string
}

export interface UserSearchResult {
  id: string
  name: string
  status: 'available' | 'pending' | 'member'
}

// ── Grupos ────────────────────────────────────────────────────────────────────

export async function getMyBolaoGroups() {
  const cached = getCache<BolaoGroup[]>('myBolaoGroups', 60_000)
  if (cached) return cached
  const { data } = await api.get('/cravou/groups/my')
  setCache('myBolaoGroups', data)
  return data as BolaoGroup[]
}

export async function createBolaoGroup(name: string, description?: string, brazilOnly?: boolean, zeroPoints?: boolean) {
  const { data } = await api.post('/cravou/groups', { name, description, brazilOnly, zeroPoints })
  clearCache('myBolaoGroups')
  return data as BolaoGroup
}

export async function getBolaoGroupDetail(id: string) {
  const key = `bolaoDetail-${id}`
  const cached = getCache<GroupDetail>(key, 30_000)
  if (cached) return cached
  const { data } = await api.get(`/cravou/groups/${id}`)
  setCache(key, data)
  return data as GroupDetail
}

export async function joinBolaoGroup(inviteCode: string) {
  const { data } = await api.post('/cravou/groups/join', { inviteCode })
  clearCache('myBolaoGroups')
  return data as { message: string; groupId: string; groupName: string }
}

export async function editBolaoGroup(id: string, name?: string, description?: string) {
  const { data } = await api.patch(`/cravou/groups/${id}`, { name, description })
  clearCache('myBolaoGroups', `bolaoDetail-${id}`)
  return data
}

export async function leaveBolaoGroup(id: string) {
  const { data } = await api.delete(`/cravou/groups/${id}/leave`)
  clearCache('myBolaoGroups', `bolaoDetail-${id}`)
  return data
}

export async function deleteBolaoGroup(id: string) {
  const { data } = await api.delete(`/cravou/groups/${id}`)
  clearCache('myBolaoGroups', `bolaoDetail-${id}`)
  return data
}

export async function removeBolaoMember(groupId: string, userId: string) {
  const { data } = await api.delete(`/cravou/groups/${groupId}/members/${userId}`)
  clearCache('myBolaoGroups', `bolaoDetail-${groupId}`)
  return data
}

// ── Convites ──────────────────────────────────────────────────────────────────

export async function searchBolaoUsers(q: string, groupId: string) {
  const { data } = await api.get('/cravou/groups/search-users', { params: { q, groupId } })
  return data as UserSearchResult[]
}

export async function sendBolaoInvite(groupId: string, inviteeId: string) {
  const { data } = await api.post(`/cravou/groups/${groupId}/invite`, { inviteeId })
  return data as { message: string; inviteId: string }
}

export async function getPendingInvites() {
  const cached = getCache<PendingInvite[]>('pendingInvites', 60_000)
  if (cached) return cached
  const { data } = await api.get('/cravou/groups/invites/pending')
  setCache('pendingInvites', data)
  return data as PendingInvite[]
}

export async function respondToInvite(inviteId: string, status: 'accepted' | 'declined') {
  const { data } = await api.patch(`/cravou/groups/invites/${inviteId}`, { status })
  clearCache('pendingInvites', 'myBolaoGroups')
  return data as { message: string; groupId?: string }
}

// ── Palpites do grupo ─────────────────────────────────────────────────────────

export interface GroupFinishedMatch {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  matchDate: string
  phase: string
  penaltyWinner: string | null
  status: string
  predictionsLocked: boolean
}

export type PalpiteCategory =
  | 'cravou' | 'resultado_bonus' | 'resultado_certo' | 'parcial' | 'errou' | 'sem_palpite'
  | 'vitoria_casa' | 'vitoria_fora' | 'empate'

export interface MemberPalpite {
  userId: string
  name: string
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: string | null
  points: number | null
  category: PalpiteCategory
}

export interface GroupMatchPalpites {
  match: GroupFinishedMatch
  palpites: MemberPalpite[]
  isFinished: boolean
}

// ── Palpites de partidas bloqueadas/ao vivo/finalizadas (grupo) ───────────────

export interface PalpitableGroupMatch {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  matchDate: string
  phase: string
  penaltyWinner: string | null
  status: 'upcoming' | 'live' | 'finished' | 'locked' | 'awaiting_result'
  predictionsLocked: boolean
}

export interface PalpitableGroupPalpite {
  userId: string
  name: string
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: string | null
  points: number | null
  category: PalpiteCategory | null
}

export interface PalpitableGroupMatchPalpites {
  match: PalpitableGroupMatch
  palpites: PalpitableGroupPalpite[]
  isFinished: boolean
}

export async function getGroupFinishedMatches(groupId: string) {
  const { data } = await api.get(`/cravou/groups/${groupId}/finished-matches`)
  return data as { matches: GroupFinishedMatch[] }
}

export async function getGroupPalpitavelMatches(groupId: string) {
  const key = `groupPalpitavel-${groupId}`
  const cached = getCache<{ matches: PalpitableGroupMatch[] }>(key, 30_000)
  if (cached) return cached
  const { data } = await api.get(`/cravou/groups/${groupId}/palpitavel-matches`)
  setCache(key, data)
  return data as { matches: PalpitableGroupMatch[] }
}

export async function getGroupMatchPalpites(groupId: string, matchId: string) {
  const key = `groupMatchPalpites-${groupId}-${matchId}`
  const cached = getCache<PalpitableGroupMatchPalpites>(key, 30_000)
  if (cached) return cached
  const { data } = await api.get(`/cravou/groups/${groupId}/matches/${matchId}/palpites`)
  setCache(key, data)
  return data as PalpitableGroupMatchPalpites
}
