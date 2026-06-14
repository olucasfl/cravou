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
export type PredCategory = 'exact' | 'bonus' | 'right' | 'partial' | 'wrong' | 'none'

export function getPredCategory(points: number | null | undefined, hasPrediction: boolean, phase?: string): PredCategory {
  if (!hasPrediction) return 'none'
  if (points === null || points === undefined) return 'none'
  if (points >= 15) return 'exact'
  if (phase !== undefined) {
    if (points === 10 && phase === 'group_stage') return 'exact'
    if (points === 7 || points === 10) return 'bonus'
  } else {
    // sem phase: comportamento antigo (10 = exact)
    if (points >= 10) return 'exact'
  }
  if (points >= 5) return 'right'
  if (points >= 2) return 'partial'
  return 'wrong'
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
