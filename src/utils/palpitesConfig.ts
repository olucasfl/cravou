// ── Avatar ────────────────────────────────────────────────────────────────────

export const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#f97316', '#6366f1',
]

export function avatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

export const LELE_ID = '6e042b19-ee86-433a-8e68-a8e43c90862c'

export function avatarColor(userId: string) {
  if (userId === LELE_ID) return '#ff0099'
  let h = 0
  for (let i = 0; i < userId.length; i++) h = userId.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function shortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'short',
  })
}

export function shortTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Search helper ─────────────────────────────────────────────────────────────

export function normalize(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// ── Category config ───────────────────────────────────────────────────────────

export interface CatConfigEntry {
  label: string
  pts: string
  css: string
}

// maps every possible category key to its CSS modifier class name
export const ALL_CAT_CSS: Record<string, string> = {
  cravou:          'cravou',
  resultado_bonus: 'bonus',
  resultado_certo: 'resultado',
  parcial:         'parcial',
  errou:           'errou',
  sem_palpite:     'sempal',
  vitoria_casa:    'vitoriacasa',
  vitoria_fora:    'vitoriafora',
  empate:          'empate',
}

export const FINISHED_CAT_ORDER = [
  'cravou', 'resultado_bonus', 'resultado_certo', 'parcial', 'errou', 'sem_palpite',
]

export const LOCKED_CAT_ORDER = ['vitoria_casa', 'vitoria_fora', 'empate', 'sem_palpite']

// pts labels depend on phase (group_stage vs knockout)
export function finishedCatConfig(phase: string): Record<string, CatConfigEntry> {
  const gs = phase === 'group_stage'
  return {
    cravou:          { label: 'Cravou!',           pts: gs ? '10 pts'    : '14–17 pts', css: 'cravou'    },
    resultado_bonus: { label: 'Resultado + Bônus',  pts: gs ? '7–8 pts'   : '10–11 pts', css: 'bonus'     },
    resultado_certo: { label: 'Resultado Certo',    pts: gs ? '5–6 pts'   : '7–8 pts',   css: 'resultado' },
    parcial:         { label: 'Gols de um time',    pts: gs ? '2 pts' : '3 pts',          css: 'parcial'   },
    errou:           { label: 'Errou tudo',          pts: '0 pts',                         css: 'errou'     },
    sem_palpite:     { label: 'Não palpitou',        pts: '—',                             css: 'sempal'    },
  }
}

export function lockedCatConfig(homeTeam: string, awayTeam: string): Record<string, CatConfigEntry> {
  return {
    vitoria_casa: { label: `Vitória ${homeTeam}`, pts: '', css: 'vitoriacasa' },
    vitoria_fora: { label: `Vitória ${awayTeam}`, pts: '', css: 'vitoriafora' },
    empate:       { label: 'Empate',               pts: '', css: 'empate'     },
    sem_palpite:  { label: 'Não palpitou',          pts: '', css: 'sempal'    },
  }
}
