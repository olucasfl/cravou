import api from './api'
import { getCache, setCache, clearCache } from '@/utils/cache'

// TTL por tipo de dado
const TTL = {
  matches:     30_000,  // 30s — socket events invalidam quando necessário
  predictions: 30_000,  // 30s
  ranking:     60_000,  // 1 min
  groups:      60_000,  // 1 min
  bracket:     60_000,  // 1 min
}

// ── Matches ──────────────────────────────────────────────────────────────────

export async function getMatches(phase?: string, status?: string) {
  const key = `matches-${phase ?? ''}-${status ?? ''}`
  const cached = getCache<Match[]>(key, TTL.matches)
  if (cached) return cached
  const params: Record<string, string> = {}
  if (phase) params.phase = phase
  if (status) params.status = status
  const { data } = await api.get('/cravou/matches', { params })
  setCache(key, data)
  return data as Match[]
}

export async function getMatch(id: string) {
  const { data } = await api.get(`/cravou/matches/${id}`)
  return data as { match: Match; prediction: Prediction | null }
}

// ── Predictions ───────────────────────────────────────────────────────────────

export async function upsertPrediction(matchId: string, homeScore: number, awayScore: number, penaltyWinner?: string) {
  const body: Record<string, unknown> = { matchId, homeScore, awayScore }
  if (penaltyWinner) body.penaltyWinner = penaltyWinner
  const { data } = await api.post('/cravou/predictions', body)
  clearCache('predictions') // palpite salvo → dados de predição ficam stale
  return data as Prediction
}

export async function getMyPredictions() {
  const cached = getCache<Prediction[]>('predictions-my', TTL.predictions)
  if (cached) return cached
  const { data } = await api.get('/cravou/predictions/my')
  setCache('predictions-my', data)
  return data as Prediction[]
}

// ── Rankings ──────────────────────────────────────────────────────────────────

export async function getRanking() {
  const cached = getCache<RankingEntry[]>('ranking-pts', TTL.ranking)
  if (cached) return cached
  const { data } = await api.get('/cravou/ranking')
  setCache('ranking-pts', data)
  return data as RankingEntry[]
}

export async function getCravasRanking() {
  const cached = getCache<RankingEntry[]>('ranking-cravadas', TTL.ranking)
  if (cached) return cached
  const { data } = await api.get('/cravou/ranking/cravadas')
  setCache('ranking-cravadas', data)
  return data as RankingEntry[]
}

// ── Copa standings ────────────────────────────────────────────────────────────

export async function getAllGroups() {
  const cached = getCache<GroupData[]>('groups-all', TTL.groups)
  if (cached) return cached
  const { data } = await api.get('/cravou/copa/groups')
  setCache('groups-all', data)
  return data as GroupData[]
}

export async function getGroup(letter: string) {
  const key = `groups-${letter}`
  const cached = getCache<{ group: string; standings: Standing[]; matches: Match[] }>(key, TTL.groups)
  if (cached) return cached
  const { data } = await api.get(`/cravou/copa/groups/${letter}`)
  setCache(key, data)
  return data as { group: string; standings: Standing[]; matches: Match[] }
}

export async function getThirdsRanking() {
  const cached = getCache<Standing[]>('groups-thirds', TTL.groups)
  if (cached) return cached
  const { data } = await api.get('/cravou/copa/standings/thirds')
  setCache('groups-thirds', data)
  return data as Standing[]
}

// ── Bracket ───────────────────────────────────────────────────────────────────

export async function getBracket() {
  const cached = getCache<BracketSlot[]>('bracket-all', TTL.bracket)
  if (cached) return cached
  const { data } = await api.get('/cravou/bracket')
  setCache('bracket-all', data)
  return data as BracketSlot[]
}

export async function getBracketByRound(round: string) {
  const key = `bracket-${round}`
  const cached = getCache<BracketSlot[]>(key, TTL.bracket)
  if (cached) return cached
  const { data } = await api.get(`/cravou/bracket/${round}`)
  setCache(key, data)
  return data as BracketSlot[]
}

// ── Palpites globais ──────────────────────────────────────────────────────────

export type GlobalPalpiteCategory =
  | 'cravou' | 'resultado_bonus' | 'resultado_certo' | 'parcial' | 'errou' | 'sem_palpite'
  | 'vitoria_casa' | 'vitoria_fora' | 'empate'

export interface GlobalPalpite {
  userId: string
  name: string
  homeScore: number | null
  awayScore: number | null
  penaltyWinner: string | null
  points: number | null
  category: GlobalPalpiteCategory
}

export interface GlobalMatch {
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

/** @deprecated use GlobalMatch */
export type GlobalFinishedMatch = GlobalMatch

export interface GlobalMatchPalpites {
  match: GlobalMatch
  palpites: GlobalPalpite[]
  isFinished: boolean
}

export async function getGlobalFinishedMatches() {
  const cached = getCache<{ matches: GlobalMatch[] }>('global-finished', 30_000)
  if (cached) return cached
  const { data } = await api.get('/cravou/matches/finished')
  setCache('global-finished', data)
  return data as { matches: GlobalMatch[] }
}

export async function getGlobalMatchPalpites(matchId: string) {
  const { data } = await api.get(`/cravou/matches/${matchId}/palpites`)
  return data as GlobalMatchPalpites
}

// ── Cravou Wrapped ────────────────────────────────────────────────────────────

export interface WrappedStatus {
  active: boolean
  activatedAt: string | null
}

export async function getWrappedStatus() {
  // Dado crítico para o gate de navegação: sem cache, sempre busca fresco.
  const { data } = await api.get('/cravou/wrapped/status')
  return data as WrappedStatus
}

export async function adminActivateWrappedPreview() {
  const { data } = await api.post('/cravou/admin/wrapped/preview')
  return data as WrappedStatus
}

export async function adminReleaseWrapped() {
  const { data } = await api.post('/cravou/admin/wrapped/release')
  return data as WrappedStatus
}

export async function adminDeactivateWrapped() {
  const { data } = await api.post('/cravou/admin/wrapped/deactivate')
  return data as WrappedStatus
}

export interface WrappedRawStatus {
  status: 'off' | 'preview' | 'released'
  previewUserId: string | null
  activatedAt: string | null
}

export async function adminGetWrappedRawStatus() {
  const { data } = await api.get('/cravou/admin/wrapped/status')
  return data as WrappedRawStatus
}

export interface WrappedComparison {
  avgAprovPct: number
}

export async function getWrappedComparison() {
  const { data } = await api.get('/cravou/wrapped/comparison')
  return data as WrappedComparison
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

export async function adminFinalizeMatch(matchId: string, homeScore: number, awayScore: number, penaltyWinner?: string) {
  const { data } = await api.post(`/cravou/admin/matches/${matchId}/finalize`, { homeScore, awayScore, penaltyWinner })
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

export async function adminResetMatch(matchId: string) {
  const { data } = await api.post(`/cravou/admin/matches/${matchId}/reset`)
  return data as { affectedUsers: number }
}

export async function adminUnlockMatch(matchId: string) {
  const { data } = await api.post(`/cravou/admin/matches/${matchId}/unlock`)
  return data
}

export async function adminInitializeAllSlots() {
  const { data } = await api.post('/cravou/admin/bracket/initialize-all')
  return data as { created: number; existing: number }
}

export async function adminMountR32() {
  const { data } = await api.post('/cravou/admin/bracket/mount-r32')
  return data
}

export async function adminSetKnockoutResult(slotId: string, winnerTeam: string) {
  const { data } = await api.post(`/cravou/admin/bracket/${slotId}/result`, { winnerTeam })
  return data
}

export async function adminOverrideSlotTeams(slotId: string, homeTeam?: string | null, awayTeam?: string | null) {
  const body: Record<string, string | null> = {}
  if (homeTeam !== undefined) body.homeTeam = homeTeam
  if (awayTeam !== undefined) body.awayTeam = awayTeam
  const { data } = await api.patch(`/cravou/admin/bracket/${slotId}/teams`, body)
  return data
}

export async function adminSyncR32Teams() {
  const { data } = await api.post('/cravou/admin/bracket/sync-r32-teams')
  return data
}

export async function adminResetSlotResult(slotId: string) {
  const { data } = await api.post(`/cravou/admin/bracket/${slotId}/reset-result`)
  return data
}

export async function adminCreateMatchFromSlot(slotId: string, matchDate: string) {
  const { data } = await api.post(`/cravou/admin/bracket/${slotId}/create-match`, { matchDate })
  return data as { match: Match; slot: BracketSlot }
}

export async function adminUnlinkMatchFromSlot(slotId: string) {
  const { data } = await api.post(`/cravou/admin/bracket/${slotId}/unlink-match`)
  return data as BracketSlot
}

export async function adminSeedCalendar() {
  const { data } = await api.post('/cravou/admin/seed-calendar')
  return data as { groupUpdated: number; groupCreated: number; knockoutCreated: number; knockoutUpdated: number; slotsUpserted: number }
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
  penaltyWinner?: string | null
  points: number | null
  createdAt?: string
  updatedAt?: string
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
  matchId: string | null
}
