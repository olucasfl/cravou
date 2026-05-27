import api from './api'

// ── Matches ──────────────────────────────────────────────────────────────────

export async function getMatches(phase?: string, status?: string) {
  const params: Record<string, string> = {}
  if (phase) params.phase = phase
  if (status) params.status = status
  const { data } = await api.get('/cravou/matches', { params })
  return data as Match[]
}

export async function getMatch(id: string) {
  const { data } = await api.get(`/cravou/matches/${id}`)
  return data as { match: Match; prediction: Prediction | null }
}

// ── Predictions ───────────────────────────────────────────────────────────────

export async function upsertPrediction(matchId: string, homeScore: number, awayScore: number) {
  const { data } = await api.post('/cravou/predictions', { matchId, homeScore, awayScore })
  return data as Prediction
}

export async function getMyPredictions() {
  const { data } = await api.get('/cravou/predictions/my')
  return data as Prediction[]
}

// ── Rankings ──────────────────────────────────────────────────────────────────

export async function getRanking() {
  const { data } = await api.get('/cravou/ranking')
  return data as RankingEntry[]
}

export async function getCravasRanking() {
  const { data } = await api.get('/cravou/ranking/cravadas')
  return data as RankingEntry[]
}

// ── Copa standings ────────────────────────────────────────────────────────────

export async function getAllGroups() {
  const { data } = await api.get('/cravou/copa/groups')
  return data as GroupData[]
}

export async function getGroup(letter: string) {
  const { data } = await api.get(`/cravou/copa/groups/${letter}`)
  return data as { group: string; standings: Standing[]; matches: Match[] }
}

export async function getThirdsRanking() {
  const { data } = await api.get('/cravou/copa/standings/thirds')
  return data as Standing[]
}

// ── Bracket ───────────────────────────────────────────────────────────────────

export async function getBracket() {
  const { data } = await api.get('/cravou/bracket')
  return data as BracketSlot[]
}

export async function getBracketByRound(round: string) {
  const { data } = await api.get(`/cravou/bracket/${round}`)
  return data as BracketSlot[]
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminGetMatches() {
  const { data } = await api.get('/cravou/admin/matches')
  return data as Match[]
}

export async function adminUpdateScore(matchId: string, homeScore: number, awayScore: number) {
  const { data } = await api.patch(`/cravou/admin/matches/${matchId}/score`, { homeScore, awayScore })
  return data
}

export async function adminUpdateStatus(matchId: string, status: string) {
  const { data } = await api.patch(`/cravou/admin/matches/${matchId}/status`, { status })
  return data
}

export async function adminLockMatch(matchId: string) {
  const { data } = await api.post(`/cravou/admin/matches/${matchId}/lock`)
  return data
}

export async function adminFinalizeMatch(matchId: string, homeScore: number, awayScore: number) {
  const { data } = await api.post(`/cravou/admin/matches/${matchId}/finalize`, { homeScore, awayScore })
  return data
}

export async function adminUpdateDate(matchId: string, matchDate: string) {
  const { data } = await api.patch(`/cravou/admin/matches/${matchId}/date`, { matchDate })
  return data
}

export async function adminReprocessMatch(matchId: string) {
  const { data } = await api.post(`/cravou/admin/matches/${matchId}/reprocess`)
  return data
}

export async function adminMountR32() {
  const { data } = await api.post('/cravou/admin/bracket/mount-r32')
  return data
}

export async function adminSetKnockoutResult(slotId: string, winnerTeam: string) {
  const { data } = await api.post(`/cravou/admin/bracket/${slotId}/result`, { winnerTeam })
  return data
}

export async function adminOverrideSlotTeams(slotId: string, homeTeam?: string, awayTeam?: string) {
  const { data } = await api.patch(`/cravou/admin/bracket/${slotId}/teams`, { homeTeam, awayTeam })
  return data
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Match {
  id: string
  phase: string
  groupName: string | null
  groupRound: number | null
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: string | null
  matchDate: string
  stadium: string | null
  status: 'upcoming' | 'live' | 'finished' | 'locked' | 'awaiting_result'
  predictionsLocked: boolean
}

export interface Prediction {
  id: string
  matchId: string
  homeScore: number
  awayScore: number
  points: number | null
}

export interface RankingEntry {
  userId: string
  name: string
  points: number
  cravadas: number
  position: number
}

export interface Standing {
  id: string
  group: string
  teamName: string
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  position: number | null
  isQualified: boolean
}

export interface GroupData {
  group: string
  standings: Standing[]
}

export interface BracketSlot {
  id: string
  round: string
  slotNumber: number
  homeDesc: string
  awayDesc: string
  homeTeam: string | null
  awayTeam: string | null
  winnerTeam: string | null
}
