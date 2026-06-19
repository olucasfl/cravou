const BRASILIA_TZ = 'America/Sao_Paulo'

export function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', {
    timeZone: BRASILIA_TZ,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatMatchTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { timeZone: BRASILIA_TZ, hour: '2-digit', minute: '2-digit' })
}

// Retorna o tempo restante em texto legível até a data alvo
export function formatTimeUntil(targetDateStr: string): string {
  const diff = new Date(targetDateStr).getTime() - Date.now()
  if (diff <= 0) return 'agora'
  const totalMin = Math.floor(diff / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

// Retorna o tempo até o fechamento dos palpites (10min antes do jogo)
export function formatTimeUntilClose(matchDateStr: string): string {
  const closeAt = new Date(new Date(matchDateStr).getTime() - 10 * 60_000)
  return formatTimeUntil(closeAt.toISOString())
}

// Quantos minutos se passaram desde o início (para contador ao vivo)
export function minutesElapsed(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000))
}

// Retorna true se falta menos de X minutos para o jogo
export function isWithinMinutes(dateStr: string, minutes: number): boolean {
  const diff = new Date(dateStr).getTime() - Date.now()
  return diff > 0 && diff <= minutes * 60_000
}

// Retorna true se falta menos de X horas para o jogo
export function isWithinHours(dateStr: string, hours: number): boolean {
  return isWithinMinutes(dateStr, hours * 60)
}

// Categoria do resultado de um palpite finalizado
export type PredCategory =
  | 'exact'          // 15pts (knockout vitória) / 10pts (grupo)
  | 'exact_bonus'    // 17pts (knockout: cravou empate + classificado correto)
  | 'exact_penalty'  // 14pts (knockout: cravou empate + classificado errado)
  | 'bonus'          // resultado certo + bônus de gols / empate+classificado
  | 'bonus_penalty'  // 7pts (knockout: acertou empate + classificado errado)
  | 'right'          // resultado certo sem bônus
  | 'partial'        // consolação
  | 'wrong'
  | 'none'

export function getPredCategory(points: number | null | undefined, hasPrediction: boolean, phase: string): PredCategory {
  if (!hasPrediction) return 'none'
  if (points === null || points === undefined) return 'none'
  if (phase === 'group_stage') {
    if (points === 10) return 'exact'
    if (points === 7 || points === 8) return 'bonus'
    if (points >= 5) return 'right'
    if (points >= 2) return 'partial'
    return 'wrong'
  }
  // Mata-mata
  if (points === 17) return 'exact_bonus'
  if (points === 15) return 'exact'
  if (points === 14) return 'exact_penalty'
  if (points === 10 || points === 11) return 'bonus'  // 11 = compat com dados antigos
  if (points === 8) return 'right'
  if (points === 7) return 'bonus_penalty'
  if (points >= 3) return 'partial'
  return 'wrong'
}

// Retorna a decomposição de pontos para resultados com bônus ou penalidade
// modifier > 0 = bônus, modifier < 0 = penalidade
export function getPredBreakdown(points: number, phase: string): { base: number; bonus: number; drawBonus: boolean; modifier: number } | null {
  if (phase === 'group_stage') {
    const base = 5
    if (points < 5 || points > 8) return null
    const diff = points - base
    return { base, bonus: diff, modifier: diff, drawBonus: diff === 1 || diff === 3 }
  }
  // Mata-mata: placar exato com empate
  if (points === 17) return { base: 15, bonus: 2, modifier:  2, drawBonus: false }
  if (points === 14) return { base: 15, bonus: 1, modifier: -1, drawBonus: false }
  // Mata-mata: resultado correto
  if (points === 10) return { base: 8,  bonus: 2, modifier:  2, drawBonus: false }
  if (points === 11) return { base: 8,  bonus: 3, modifier:  3, drawBonus: false }
  if (points === 7)  return { base: 8,  bonus: 1, modifier: -1, drawBonus: false }
  return null
}

export function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    group_stage: 'Fase de Grupos',
    round_of_32: '16 Avos de Final',
    round_of_16: 'Oitavas de Final',
    quarterfinal: 'Quartas de Final',
    semifinal: 'Semifinal',
    third_place: '3º Lugar',
    final: 'Final',
  }
  return map[phase] ?? phase
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    upcoming: 'Agendado',
    locked: 'Bloqueado',
    live: 'Ao vivo',
    awaiting_result: 'Aguardando resultado',
    finished: 'Encerrado',
  }
  return map[status] ?? status
}
