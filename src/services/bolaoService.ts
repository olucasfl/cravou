import api from './api'

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
  const { data } = await api.get('/cravou/groups/my')
  return data as BolaoGroup[]
}

export async function createBolaoGroup(name: string, description?: string) {
  const { data } = await api.post('/cravou/groups', { name, description })
  return data as BolaoGroup
}

export async function getBolaoGroupDetail(id: string) {
  const { data } = await api.get(`/cravou/groups/${id}`)
  return data as GroupDetail
}

export async function joinBolaoGroup(inviteCode: string) {
  const { data } = await api.post('/cravou/groups/join', { inviteCode })
  return data as { message: string; groupId: string; groupName: string }
}

export async function editBolaoGroup(id: string, name?: string, description?: string) {
  const { data } = await api.patch(`/cravou/groups/${id}`, { name, description })
  return data
}

export async function leaveBolaoGroup(id: string) {
  const { data } = await api.delete(`/cravou/groups/${id}/leave`)
  return data
}

export async function deleteBolaoGroup(id: string) {
  const { data } = await api.delete(`/cravou/groups/${id}`)
  return data
}

export async function removeBolaoMember(groupId: string, userId: string) {
  const { data } = await api.delete(`/cravou/groups/${groupId}/members/${userId}`)
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
  const { data } = await api.get('/cravou/groups/invites/pending')
  return data as PendingInvite[]
}

export async function respondToInvite(inviteId: string, status: 'accepted' | 'declined') {
  const { data } = await api.patch(`/cravou/groups/invites/${inviteId}`, { status })
  return data as { message: string; groupId?: string }
}
