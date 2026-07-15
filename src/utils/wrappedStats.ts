import type { GroupData, Match, Prediction } from '@/services/cravouService'
import { getPredCategory, phaseLabel } from '@/utils/format'

function isCravada(points: number | null, phase: string): boolean {
  if (points === null) return false
  return phase === 'group_stage' ? points === 10 : [14, 15, 17].includes(points)
}

function buildMatchMap(matches: Match[]) {
  return new Map(matches.map(m => [m.id, m]))
}

// ── Cravadas ────────────────────────────────────────────────────────────────

export interface CravadaHit {
  matchId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  matchDate: string
}

export function getCravadas(matches: Match[], predictions: Prediction[]): CravadaHit[] {
  const matchMap = buildMatchMap(matches)
  const hits: CravadaHit[] = []
  for (const p of predictions) {
    const match = matchMap.get(p.matchId)
    if (!match || match.homeScore === null || match.awayScore === null) continue
    if (!isCravada(p.points, match.phase)) continue
    hits.push({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      matchDate: match.matchDate,
    })
  }
  return hits.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
}

// ── Placar mais ousado ───────────────────────────────────────────────────────

export interface BoldestPick {
  matchId: string
  homeTeam: string
  awayTeam: string
  predictedHome: number
  predictedAway: number
  totalGoals: number
}

export function getBoldestPick(matches: Match[], predictions: Prediction[]): BoldestPick | null {
  const matchMap = buildMatchMap(matches)
  let best: BoldestPick | null = null
  for (const p of predictions) {
    const match = matchMap.get(p.matchId)
    if (!match) continue
    const totalGoals = p.homeScore + p.awayScore
    const diff = Math.abs(p.homeScore - p.awayScore)
    if (
      !best ||
      totalGoals > best.totalGoals ||
      (totalGoals === best.totalGoals && diff > Math.abs(best.predictedHome - best.predictedAway))
    ) {
      best = {
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        predictedHome: p.homeScore,
        predictedAway: p.awayScore,
        totalGoals,
      }
    }
  }
  return best
}

// ── Maior sequência de acertos ───────────────────────────────────────────────

export interface StreakResult {
  length: number
  hits: CravadaHit[]
}

export function getBestStreak(matches: Match[], predictions: Prediction[]): StreakResult {
  const matchMap = buildMatchMap(matches)
  const scored = predictions
    .filter(p => p.points !== null)
    .map(p => ({ p, match: matchMap.get(p.matchId) }))
    .filter((x): x is { p: Prediction; match: Match } => !!x.match)
    .sort((a, b) => new Date(a.match.matchDate).getTime() - new Date(b.match.matchDate).getTime())

  let current: CravadaHit[] = []
  let best: CravadaHit[] = []

  for (const { p, match } of scored) {
    const hit: CravadaHit = {
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
      matchDate: match.matchDate,
    }
    if ((p.points ?? 0) > 0) {
      current.push(hit)
      if (current.length > best.length) best = current
    } else {
      current = []
    }
  }

  return { length: best.length, hits: best }
}

// ── Melhor fase ───────────────────────────────────────────────────────────

export interface PhaseBreakdown {
  phase: string
  label: string
  totalPoints: number
  matchesCount: number
}

export function getBestPhase(matches: Match[], predictions: Prediction[]): PhaseBreakdown | null {
  const matchMap = buildMatchMap(matches)
  const byPhase = new Map<string, { totalPoints: number; matchesCount: number }>()

  for (const p of predictions) {
    if (p.points === null) continue
    const match = matchMap.get(p.matchId)
    if (!match) continue
    const entry = byPhase.get(match.phase) ?? { totalPoints: 0, matchesCount: 0 }
    entry.totalPoints += p.points
    entry.matchesCount += 1
    byPhase.set(match.phase, entry)
  }

  let best: PhaseBreakdown | null = null
  for (const [phase, entry] of byPhase) {
    if (!best || entry.totalPoints > best.totalPoints) {
      best = { phase, label: phaseLabel(phase), ...entry }
    }
  }
  return best
}

// ── Evolução de pontos ──────────────────────────────────────────────────────

export interface EvolutionPoint {
  matchDate: string
  cumulativePoints: number
}

export function getPointsEvolution(matches: Match[], predictions: Prediction[]): EvolutionPoint[] {
  const matchMap = buildMatchMap(matches)
  const scored = predictions
    .filter(p => p.points !== null)
    .map(p => ({ points: p.points as number, match: matchMap.get(p.matchId) }))
    .filter((x): x is { points: number; match: Match } => !!x.match)
    .sort((a, b) => new Date(a.match.matchDate).getTime() - new Date(b.match.matchDate).getTime())

  let cumulative = 0
  return scored.map(({ points, match }) => {
    cumulative += points
    return { matchDate: match.matchDate, cumulativePoints: cumulative }
  })
}

// ── Percentil (para comparação com outros jogadores) ─────────────────────────

// Retorna quantos % dos jogadores o usuário superou (100 = melhor colocado, 0 = último).
export function getPercentile(position: number, total: number): number {
  if (total <= 1) return 100
  return Math.round(((total - position) / (total - 1)) * 100)
}

// ── Aproveitamento geral ─────────────────────────────────────────────────────

export interface AproveitamentoStats {
  total: number
  cravadas: number
  certos: number
  parciais: number
  erros: number
  missed: number
  aprovPct: number
}

export function getAproveitamento(matches: Match[], predictions: Prediction[]): AproveitamentoStats {
  const matchMap = buildMatchMap(matches)
  const totalFinished = matches.filter(m => m.status === 'finished').length
  const finished = predictions.filter(p => p.points !== null)

  let cravadas = 0, certos = 0, parciais = 0, erros = 0
  for (const p of finished) {
    const phase = matchMap.get(p.matchId)?.phase ?? 'group_stage'
    const c = getPredCategory(p.points, true, phase)
    if (c === 'exact' || c === 'exact_bonus' || c === 'exact_penalty') cravadas++
    else if (c === 'bonus' || c === 'bonus_penalty' || c === 'right') certos++
    else if (c === 'partial') parciais++
    else if (c === 'wrong') erros++
  }

  const missed = Math.max(0, totalFinished - finished.length)
  const pontuaram = finished.filter(p => (p.points ?? 0) > 0).length
  const aprovPct = finished.length > 0 ? Math.round((pontuaram / finished.length) * 100) : 0

  return { total: predictions.length, cravadas, certos, parciais, erros, missed, aprovPct }
}

// ── Fidelidade ao palpite (editou ou nunca mudou de ideia) ───────────────────
// Só sabemos se cada palpite foi editado ALGUMA vez (createdAt !== updatedAt) —
// não existe histórico de quantas vezes, o banco guarda só o timestamp mais recente.

export interface FidelityStats {
  editedCount: number
  totalCount: number
  neverEdited: boolean
}

export function getFidelity(predictions: Prediction[]): FidelityStats {
  const totalCount = predictions.length
  const editedCount = predictions.filter(
    p => p.createdAt && p.updatedAt && p.createdAt !== p.updatedAt
  ).length
  return { editedCount, totalCount, neverEdited: totalCount > 0 && editedCount === 0 }
}

// ── Média de gols palpitados (cauteloso vs sem medo de goleada) ──────────────

export function getAvgPredictedGoals(predictions: Prediction[]): number | null {
  if (predictions.length === 0) return null
  const total = predictions.reduce((sum, p) => sum + p.homeScore + p.awayScore, 0)
  return total / predictions.length
}

// ── Time do coração (mais escalado como vencedor) ────────────────────────────

export interface FavoriteTeam {
  team: string
  count: number
}

export function getFavoriteTeam(matches: Match[], predictions: Prediction[]): FavoriteTeam | null {
  const matchMap = buildMatchMap(matches)
  const tally = new Map<string, number>()
  for (const p of predictions) {
    const match = matchMap.get(p.matchId)
    if (!match || p.homeScore === p.awayScore) continue
    const picked = p.homeScore > p.awayScore ? match.homeTeam : match.awayTeam
    tally.set(picked, (tally.get(picked) ?? 0) + 1)
  }
  let best: FavoriteTeam | null = null
  for (const [team, count] of tally) {
    if (!best || count > best.count) best = { team, count }
  }
  return best
}

// ── Zebra certeira (só fase de grupos — é onde temos posição final do grupo) ─
// "Zebra" = o usuário apostou no time pior colocado no grupo pra vencer o time
// mais bem colocado, e isso realmente aconteceu. Mata-mata não é coberto: não
// temos nenhum indicador próprio de "favorito" pra essas fases.

export interface UpsetCall {
  matchId: string
  homeTeam: string
  awayTeam: string
  pickedTeam: string
  pickedPosition: number
  opponentPosition: number
}

export function getUpsetCall(matches: Match[], predictions: Prediction[], groups: GroupData[]): UpsetCall | null {
  const positionByTeam = new Map<string, number>()
  for (const g of groups) {
    for (const st of g.standings) {
      if (st.position !== null) positionByTeam.set(st.teamName, st.position)
    }
  }

  const matchMap = buildMatchMap(matches)
  const candidates = predictions
    .map(p => ({ p, match: matchMap.get(p.matchId) }))
    .filter((x): x is { p: Prediction; match: Match } => !!x.match)
    .filter(({ match }) => match.phase === 'group_stage')
    .filter(({ match }) => match.homeScore !== null && match.awayScore !== null)
    .filter(({ p }) => p.homeScore !== p.awayScore)
    .sort((a, b) => new Date(a.match.matchDate).getTime() - new Date(b.match.matchDate).getTime())

  for (const { p, match } of candidates) {
    const predictedWinner = p.homeScore > p.awayScore ? match.homeTeam : match.awayTeam
    const actualWinner =
      match.homeScore! > match.awayScore! ? match.homeTeam
        : match.awayScore! > match.homeScore! ? match.awayTeam
          : null
    if (!actualWinner || predictedWinner !== actualWinner) continue

    const loser = predictedWinner === match.homeTeam ? match.awayTeam : match.homeTeam
    const pickedPosition = positionByTeam.get(predictedWinner)
    const opponentPosition = positionByTeam.get(loser)
    if (pickedPosition === undefined || opponentPosition === undefined) continue
    if (pickedPosition > opponentPosition) {
      return {
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        pickedTeam: predictedWinner,
        pickedPosition,
        opponentPosition,
      }
    }
  }
  return null
}

// ── Apelido da Copa ───────────────────────────────────────────────────────────
// Cascata de regras — a primeira que bater define o apelido. Sempre garante um
// resultado (o último item é o fallback "Torcedor Raiz").

export interface NicknameResult {
  emoji: string
  title: string
  blurb: string
}

export interface NicknameInput {
  cravadasCount: number
  /** Posição real no ranking de cravadas (1 = melhor). Percentil não serve aqui —
   *  num grupo de 36 pessoas, ficar em 6º já dá ~86º percentil, o que soava "top"
   *  mas não bate com a sensação real de "estar entre os melhores". Posição direta
   *  reflete melhor o pódio de cravadas que a própria retrospectiva já revela. */
  cravadasPosition: number | null
  aprovPct: number
  avgAprovPct: number | null
  finishedCount: number
  hasUpsetCall: boolean
  bestStreakLength: number
  fidelity: FidelityStats
  boldestTotalGoals: number | null
  avgPredictedGoals: number | null
  bestPhaseIsGroupStage: boolean | null
}

const VIDENTE_MAX_POSITION = 3

export function getNickname(input: NicknameInput): NicknameResult {
  const {
    cravadasCount, cravadasPosition, aprovPct, avgAprovPct, finishedCount, hasUpsetCall,
    bestStreakLength, fidelity, boldestTotalGoals, avgPredictedGoals, bestPhaseIsGroupStage,
  } = input

  if (cravadasPosition !== null && cravadasPosition <= VIDENTE_MAX_POSITION && cravadasCount >= 3) {
    return { emoji: '🔮', title: 'O Vidente', blurb: `${cravadasPosition}º lugar no ranking de cravadas, com ${cravadasCount} placares exatos.` }
  }
  if (avgAprovPct !== null && finishedCount >= 5 && aprovPct >= avgAprovPct + 20) {
    return { emoji: '🎯', title: 'Certeiro', blurb: `${aprovPct}% de aproveitamento — bem acima da média geral (${avgAprovPct}%).` }
  }
  if (hasUpsetCall) {
    return { emoji: '🦓', title: 'Zebra Certeira', blurb: 'Apostou contra o favorito do grupo e acertou na mosca.' }
  }
  if (bestStreakLength >= 5) {
    return { emoji: '🔥', title: 'Em Chamas', blurb: `${bestStreakLength} palpites seguidos pontuando.` }
  }
  if (fidelity.neverEdited && fidelity.totalCount >= 5) {
    return { emoji: '💍', title: 'Fiel à Seleção', blurb: 'Nunca mudou de ideia em nenhum palpite até fechar.' }
  }
  if (fidelity.totalCount > 0 && fidelity.editedCount / fidelity.totalCount >= 0.5) {
    return { emoji: '🌀', title: 'Indeciso do Grupo', blurb: 'Mudou de ideia em mais da metade dos palpites.' }
  }
  if (boldestTotalGoals !== null && boldestTotalGoals >= 6) {
    return { emoji: '💣', title: 'Sem Medo de Goleada', blurb: `Chegou a palpitar ${boldestTotalGoals} gols em um jogo só.` }
  }
  if (avgPredictedGoals !== null && avgPredictedGoals <= 1.8) {
    return { emoji: '🧤', title: 'Cauteloso', blurb: 'Sempre apostando em jogos mais fechados.' }
  }
  if (bestPhaseIsGroupStage === false) {
    return { emoji: '⚔️', title: 'Bicho do Mata-Mata', blurb: 'Se saiu melhor quando o jogo virou eliminatório.' }
  }
  if (bestPhaseIsGroupStage === true) {
    return { emoji: '🏟️', title: 'Rei da Fase de Grupos', blurb: 'Mandou bem desde o início da Copa.' }
  }
  return { emoji: '❤️', title: 'Torcedor Raiz', blurb: 'Viveu a Copa inteira com o coração no Cravou.' }
}
