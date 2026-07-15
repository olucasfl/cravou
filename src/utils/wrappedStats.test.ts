import { describe, expect, it } from 'vitest'
import type { GroupData, Match, Prediction } from '@/services/cravouService'
import {
  getAproveitamento,
  getAvgPredictedGoals,
  getBestPhase,
  getBestStreak,
  getBoldestPick,
  getCravadas,
  getFavoriteTeam,
  getFidelity,
  getNickname,
  getPercentile,
  getPointsEvolution,
  getUpsetCall,
  type NicknameInput,
} from './wrappedStats'

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
  return {
    phase: 'group_stage',
    groupName: null,
    groupRound: null,
    homeTeam: 'Brasil',
    awayTeam: 'Argentina',
    homeScore: 2,
    awayScore: 1,
    penaltyWinner: null,
    matchDate: '2026-06-10T18:00:00.000Z',
    stadium: null,
    status: 'finished',
    predictionsLocked: true,
    ...overrides,
  }
}

function makePrediction(overrides: Partial<Prediction> & { matchId: string }): Prediction {
  return {
    id: `pred-${overrides.matchId}`,
    homeScore: 2,
    awayScore: 1,
    penaltyWinner: null,
    points: 10,
    ...overrides,
  }
}

describe('wrappedStats — dados vazios (usuário sem nenhum palpite)', () => {
  it('getCravadas retorna vazio', () => {
    expect(getCravadas([], [])).toEqual([])
  })

  it('getBoldestPick retorna null', () => {
    expect(getBoldestPick([], [])).toBeNull()
  })

  it('getBestStreak retorna length 0 e hits vazio', () => {
    expect(getBestStreak([], [])).toEqual({ length: 0, hits: [] })
  })

  it('getBestPhase retorna null', () => {
    expect(getBestPhase([], [])).toBeNull()
  })

  it('getPointsEvolution retorna vazio', () => {
    expect(getPointsEvolution([], [])).toEqual([])
  })

  it('getAproveitamento não quebra com tudo vazio', () => {
    expect(getAproveitamento([], [])).toEqual({
      total: 0, cravadas: 0, certos: 0, parciais: 0, erros: 0, missed: 0, aprovPct: 0,
    })
  })
})

describe('getCravadas', () => {
  it('reconhece cravada de grupo (10pts) e de mata-mata (15/17/14), ignora o resto, ordena por data', () => {
    const matches = [
      makeMatch({ id: 'm1', phase: 'group_stage', matchDate: '2026-06-20T00:00:00.000Z' }),
      makeMatch({ id: 'm2', phase: 'final', matchDate: '2026-06-10T00:00:00.000Z' }),
      makeMatch({ id: 'm3', phase: 'group_stage', matchDate: '2026-06-15T00:00:00.000Z' }),
    ]
    const predictions = [
      makePrediction({ matchId: 'm1', points: 10 }),   // cravada grupo
      makePrediction({ matchId: 'm2', points: 15 }),   // cravada mata-mata
      makePrediction({ matchId: 'm3', points: 5 }),    // não é cravada
    ]
    const result = getCravadas(matches, predictions)
    expect(result.map(h => h.matchId)).toEqual(['m2', 'm1'])
  })
})

describe('getBoldestPick', () => {
  it('escolhe o palpite com mais gols somados', () => {
    const matches = [makeMatch({ id: 'm1' }), makeMatch({ id: 'm2' })]
    const predictions = [
      makePrediction({ matchId: 'm1', homeScore: 1, awayScore: 1 }),
      makePrediction({ matchId: 'm2', homeScore: 4, awayScore: 3 }),
    ]
    expect(getBoldestPick(matches, predictions)?.matchId).toBe('m2')
  })

  it('desempata por maior diferença de gols quando o total é igual', () => {
    const matches = [makeMatch({ id: 'm1' }), makeMatch({ id: 'm2' })]
    const predictions = [
      makePrediction({ matchId: 'm1', homeScore: 3, awayScore: 3 }), // total 6, diff 0
      makePrediction({ matchId: 'm2', homeScore: 5, awayScore: 1 }), // total 6, diff 4
    ]
    expect(getBoldestPick(matches, predictions)?.matchId).toBe('m2')
  })
})

describe('getBestStreak', () => {
  it('encontra a maior sequência consecutiva de palpites que pontuaram, ordenada por data do jogo', () => {
    const matches = [
      makeMatch({ id: 'm1', matchDate: '2026-06-01T00:00:00.000Z' }),
      makeMatch({ id: 'm2', matchDate: '2026-06-02T00:00:00.000Z' }),
      makeMatch({ id: 'm3', matchDate: '2026-06-03T00:00:00.000Z' }),
      makeMatch({ id: 'm4', matchDate: '2026-06-04T00:00:00.000Z' }),
      makeMatch({ id: 'm5', matchDate: '2026-06-05T00:00:00.000Z' }),
    ]
    const predictions = [
      makePrediction({ matchId: 'm1', points: 0 }),
      makePrediction({ matchId: 'm2', points: 5 }),
      makePrediction({ matchId: 'm3', points: 10 }),
      makePrediction({ matchId: 'm4', points: 2 }),
      makePrediction({ matchId: 'm5', points: 0 }),
    ]
    const result = getBestStreak(matches, predictions)
    expect(result.length).toBe(3)
    expect(result.hits.map(h => h.matchId)).toEqual(['m2', 'm3', 'm4'])
  })

  it('sequência de 1 acerto isolado ainda é reportada (chamador decide como exibir)', () => {
    const matches = [makeMatch({ id: 'm1' })]
    const predictions = [makePrediction({ matchId: 'm1', points: 5 })]
    expect(getBestStreak(matches, predictions).length).toBe(1)
  })
})

describe('getBestPhase', () => {
  it('escolhe a fase com maior soma de pontos', () => {
    const matches = [
      makeMatch({ id: 'm1', phase: 'group_stage' }),
      makeMatch({ id: 'm2', phase: 'group_stage' }),
      makeMatch({ id: 'm3', phase: 'final' }),
    ]
    const predictions = [
      makePrediction({ matchId: 'm1', points: 5 }),
      makePrediction({ matchId: 'm2', points: 5 }),
      makePrediction({ matchId: 'm3', points: 8 }),
    ]
    expect(getBestPhase(matches, predictions)?.phase).toBe('group_stage')
  })
})

describe('getPointsEvolution', () => {
  it('acumula pontos em ordem cronológica', () => {
    const matches = [
      makeMatch({ id: 'm1', matchDate: '2026-06-02T00:00:00.000Z' }),
      makeMatch({ id: 'm2', matchDate: '2026-06-01T00:00:00.000Z' }),
    ]
    const predictions = [
      makePrediction({ matchId: 'm1', points: 5 }),
      makePrediction({ matchId: 'm2', points: 10 }),
    ]
    expect(getPointsEvolution(matches, predictions).map(e => e.cumulativePoints)).toEqual([10, 15])
  })
})

describe('getPercentile', () => {
  it('1º lugar supera 100% dos outros', () => {
    expect(getPercentile(1, 10)).toBe(100)
  })

  it('último lugar supera 0%', () => {
    expect(getPercentile(10, 10)).toBe(0)
  })

  it('meio da tabela fica por volta de 50%', () => {
    expect(getPercentile(3, 5)).toBe(50)
  })

  it('com 1 único jogador, sempre 100%', () => {
    expect(getPercentile(1, 1)).toBe(100)
  })
})

describe('getAproveitamento', () => {
  it('conta missed como jogos finalizados sem palpite pontuado', () => {
    const matches = [
      makeMatch({ id: 'm1', status: 'finished' }),
      makeMatch({ id: 'm2', status: 'finished' }),
    ]
    const predictions = [makePrediction({ matchId: 'm1', points: 10 })]
    const stats = getAproveitamento(matches, predictions)
    expect(stats.missed).toBe(1)
    expect(stats.cravadas).toBe(1)
    expect(stats.aprovPct).toBe(100)
  })
})

function makeGroupData(group: string, standings: { teamName: string; position: number | null }[]): GroupData {
  return {
    group,
    standings: standings.map(st => ({
      id: `${group}-${st.teamName}`,
      group,
      matchesPlayed: 3,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      isQualified: (st.position ?? 5) <= 2,
      ...st,
    })),
  }
}

describe('getFidelity', () => {
  it('nunca editou quando createdAt === updatedAt em todos os palpites', () => {
    const predictions = [
      makePrediction({ matchId: 'm1', createdAt: 't1', updatedAt: 't1' }),
      makePrediction({ matchId: 'm2', createdAt: 't2', updatedAt: 't2' }),
    ]
    expect(getFidelity(predictions)).toEqual({ editedCount: 0, totalCount: 2, neverEdited: true })
  })

  it('detecta edição quando createdAt difere de updatedAt', () => {
    const predictions = [
      makePrediction({ matchId: 'm1', createdAt: 't1', updatedAt: 't1' }),
      makePrediction({ matchId: 'm2', createdAt: 't2', updatedAt: 't2-editado' }),
    ]
    const result = getFidelity(predictions)
    expect(result).toEqual({ editedCount: 1, totalCount: 2, neverEdited: false })
  })

  it('sem palpites, neverEdited é false (nada a avaliar)', () => {
    expect(getFidelity([])).toEqual({ editedCount: 0, totalCount: 0, neverEdited: false })
  })
})

describe('getAvgPredictedGoals', () => {
  it('calcula a média de gols somados por palpite', () => {
    const predictions = [
      makePrediction({ matchId: 'm1', homeScore: 2, awayScore: 1 }),
      makePrediction({ matchId: 'm2', homeScore: 0, awayScore: 0 }),
    ]
    expect(getAvgPredictedGoals(predictions)).toBe(1.5)
  })

  it('retorna null sem palpites', () => {
    expect(getAvgPredictedGoals([])).toBeNull()
  })
})

describe('getFavoriteTeam', () => {
  it('conta o time mais escalado como vencedor, ignora empates', () => {
    const matches = [
      makeMatch({ id: 'm1', homeTeam: 'Brasil', awayTeam: 'Argentina' }),
      makeMatch({ id: 'm2', homeTeam: 'Brasil', awayTeam: 'Uruguai' }),
      makeMatch({ id: 'm3', homeTeam: 'França', awayTeam: 'Brasil' }),
    ]
    const predictions = [
      makePrediction({ matchId: 'm1', homeScore: 2, awayScore: 0 }), // Brasil
      makePrediction({ matchId: 'm2', homeScore: 1, awayScore: 1 }), // empate, ignora
      makePrediction({ matchId: 'm3', homeScore: 0, awayScore: 2 }), // Brasil (fora)
    ]
    expect(getFavoriteTeam(matches, predictions)).toEqual({ team: 'Brasil', count: 2 })
  })

  it('retorna null sem nenhum palpite com vencedor definido', () => {
    expect(getFavoriteTeam([], [])).toBeNull()
  })
})

describe('getUpsetCall', () => {
  it('detecta quando o usuário apostou no time pior colocado do grupo e acertou', () => {
    const matches = [makeMatch({ id: 'm1', phase: 'group_stage', homeTeam: 'Marrocos', awayTeam: 'Alemanha', homeScore: 1, awayScore: 0 })]
    const predictions = [makePrediction({ matchId: 'm1', homeScore: 1, awayScore: 0 })]
    const groups = [makeGroupData('E', [
      { teamName: 'Marrocos', position: 3 },
      { teamName: 'Alemanha', position: 1 },
    ])]
    const result = getUpsetCall(matches, predictions, groups)
    expect(result?.pickedTeam).toBe('Marrocos')
  })

  it('não conta como zebra se o time apostado era o favorito', () => {
    const matches = [makeMatch({ id: 'm1', phase: 'group_stage', homeTeam: 'Alemanha', awayTeam: 'Marrocos', homeScore: 2, awayScore: 0 })]
    const predictions = [makePrediction({ matchId: 'm1', homeScore: 2, awayScore: 0 })]
    const groups = [makeGroupData('E', [
      { teamName: 'Alemanha', position: 1 },
      { teamName: 'Marrocos', position: 3 },
    ])]
    expect(getUpsetCall(matches, predictions, groups)).toBeNull()
  })

  it('ignora mata-mata (sem posição de grupo pra comparar)', () => {
    const matches = [makeMatch({ id: 'm1', phase: 'final', homeTeam: 'Marrocos', awayTeam: 'Alemanha', homeScore: 1, awayScore: 0 })]
    const predictions = [makePrediction({ matchId: 'm1', homeScore: 1, awayScore: 0 })]
    const groups = [makeGroupData('E', [
      { teamName: 'Marrocos', position: 3 },
      { teamName: 'Alemanha', position: 1 },
    ])]
    expect(getUpsetCall(matches, predictions, groups)).toBeNull()
  })

  it('sem grupos carregados, retorna null', () => {
    const matches = [makeMatch({ id: 'm1', phase: 'group_stage', homeScore: 1, awayScore: 0 })]
    const predictions = [makePrediction({ matchId: 'm1', homeScore: 1, awayScore: 0 })]
    expect(getUpsetCall(matches, predictions, [])).toBeNull()
  })
})

describe('getNickname', () => {
  const base: NicknameInput = {
    cravadasCount: 0,
    cravadasPosition: null,
    aprovPct: 0,
    avgAprovPct: null,
    finishedCount: 0,
    hasUpsetCall: false,
    bestStreakLength: 0,
    fidelity: { editedCount: 0, totalCount: 0, neverEdited: false },
    boldestTotalGoals: null,
    avgPredictedGoals: null,
    bestPhaseIsGroupStage: null,
  }

  it('sem nenhuma regra especial, cai no fallback Torcedor Raiz', () => {
    expect(getNickname(base).title).toBe('Torcedor Raiz')
  })

  it('O Vidente — top 3 no ranking de cravadas e volume mínimo', () => {
    expect(getNickname({ ...base, cravadasCount: 4, cravadasPosition: 3 }).title).toBe('O Vidente')
  })

  it('O Vidente não bate fora do top 3, mesmo com bastante cravada', () => {
    expect(getNickname({ ...base, cravadasCount: 9, cravadasPosition: 6 }).title).not.toBe('O Vidente')
  })

  it('O Vidente não bate com poucas cravadas mesmo em 1º lugar', () => {
    expect(getNickname({ ...base, cravadasCount: 1, cravadasPosition: 1 }).title).not.toBe('O Vidente')
  })

  it('Certeiro — aproveitamento bem acima da média', () => {
    expect(getNickname({ ...base, aprovPct: 80, avgAprovPct: 50, finishedCount: 6 }).title).toBe('Certeiro')
  })

  it('Zebra Certeira tem prioridade sobre Em Chamas', () => {
    expect(getNickname({ ...base, hasUpsetCall: true, bestStreakLength: 8 }).title).toBe('Zebra Certeira')
  })

  it('Em Chamas — sequência longa', () => {
    expect(getNickname({ ...base, bestStreakLength: 6 }).title).toBe('Em Chamas')
  })

  it('Fiel à Seleção — nunca editou, com volume mínimo', () => {
    expect(getNickname({ ...base, fidelity: { editedCount: 0, totalCount: 6, neverEdited: true } }).title).toBe('Fiel à Seleção')
  })

  it('Indeciso do Grupo — editou metade ou mais', () => {
    expect(getNickname({ ...base, fidelity: { editedCount: 3, totalCount: 5, neverEdited: false } }).title).toBe('Indeciso do Grupo')
  })

  it('Sem Medo de Goleada — palpite ousado', () => {
    expect(getNickname({ ...base, boldestTotalGoals: 7 }).title).toBe('Sem Medo de Goleada')
  })

  it('Cauteloso — média de gols palpitados baixa', () => {
    expect(getNickname({ ...base, avgPredictedGoals: 1.2 }).title).toBe('Cauteloso')
  })

  it('Bicho do Mata-Mata — melhor fase fora dos grupos', () => {
    expect(getNickname({ ...base, bestPhaseIsGroupStage: false }).title).toBe('Bicho do Mata-Mata')
  })

  it('Rei da Fase de Grupos — melhor fase é a fase de grupos', () => {
    expect(getNickname({ ...base, bestPhaseIsGroupStage: true }).title).toBe('Rei da Fase de Grupos')
  })
})
