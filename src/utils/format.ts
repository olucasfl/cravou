export function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatMatchTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const FLAGS: Record<string, string> = {
  // Grupo A
  mexico: '🇲🇽', 'south africa': '🇿🇦', 'south korea': '🇰🇷', 'czech republic': '🇨🇿',
  // Grupo B
  canada: '🇨🇦', 'bosnia-herzegovina': '🇧🇦', qatar: '🇶🇦', switzerland: '🇨🇭',
  // Grupo C
  brazil: '🇧🇷', morocco: '🇲🇦', haiti: '🇭🇹', scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  // Grupo D
  usa: '🇺🇸', paraguay: '🇵🇾', australia: '🇦🇺', turkey: '🇹🇷',
  // Grupo E
  germany: '🇩🇪', curacao: '🇨🇼', 'ivory coast': '🇨🇮', ecuador: '🇪🇨',
  // Grupo F
  netherlands: '🇳🇱', japan: '🇯🇵', sweden: '🇸🇪', tunisia: '🇹🇳',
  // Grupo G
  belgium: '🇧🇪', egypt: '🇪🇬', iran: '🇮🇷', 'new zealand': '🇳🇿',
  // Grupo H
  spain: '🇪🇸', 'cape verde': '🇨🇻', 'saudi arabia': '🇸🇦', uruguay: '🇺🇾',
  // Grupo I
  france: '🇫🇷', senegal: '🇸🇳', iraq: '🇮🇶', norway: '🇳🇴',
  // Grupo J
  argentina: '🇦🇷', algeria: '🇩🇿', austria: '🇦🇹', jordan: '🇯🇴',
  // Grupo K
  portugal: '🇵🇹', 'dr congo': '🇨🇩', uzbekistan: '🇺🇿', colombia: '🇨🇴',
  // Grupo L
  england: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', croatia: '🇭🇷', ghana: '🇬🇭', panama: '🇵🇦',
}

export function teamFlag(name: string): string {
  return FLAGS[name.toLowerCase()] ?? '🏳️'
}

export function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    group_stage: 'Fase de Grupos',
    round_of_32: 'Oitavas de Final',
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
    finished: 'Encerrado',
  }
  return map[status] ?? status
}
