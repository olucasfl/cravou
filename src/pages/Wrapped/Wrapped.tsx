import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppData } from '@/context/AppDataContext'
import { markWrappedSeen } from '@/utils/wrappedSeen'
import { getWrappedComparison } from '@/services/cravouService'
import {
  getAproveitamento, getAvgPredictedGoals, getBestPhase, getBestStreak, getBoldestPick, getCravadas,
  getFidelity, getNickname, getPercentile, getPointsEvolution, getUpsetCall,
} from '@/utils/wrappedStats'
import StoryViewer, { type Scene } from '@/components/StoryViewer/StoryViewer'
import IntroScene from './scenes/IntroScene'
import PodiumHypeScene from './scenes/PodiumHypeScene'
import PodiumScene from './scenes/PodiumScene'
import RankingScene from './scenes/RankingScene'
import CravadasScene from './scenes/CravadasScene'
import BoldestScene from './scenes/BoldestScene'
import StreakScene from './scenes/StreakScene'
import EvolutionScene from './scenes/EvolutionScene'
import BestPhaseScene from './scenes/BestPhaseScene'
import AproveitamentoScene from './scenes/AproveitamentoScene'
import ComparisonScene from './scenes/ComparisonScene'
import NicknameScene from './scenes/NicknameScene'
import OutroScene from './scenes/OutroScene'

export default function Wrapped() {
  const { user, matches, predictions, ranking, groups, wrapped } = useAppData()
  const location = useLocation()
  const navigate = useNavigate()

  // Média de aproveitamento de todo mundo — só existe no backend (não dá pra
  // calcular no cliente sem os palpites de todos os outros usuários). A cena
  // de comparação é a penúltima (antes do encerramento), então buscar em
  // paralelo é seguro: mesmo que ainda não tenha chegado, o usuário demora
  // bem mais que isso pra alcançar essa cena — e ela só entra na lista
  // quando o dado existir, sem deslocar nenhuma cena já vista.
  const [avgAprovPct, setAvgAprovPct] = useState<number | null>(null)

  useEffect(() => {
    markWrappedSeen(wrapped.activatedAt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    getWrappedComparison()
      .then(r => setAvgAprovPct(r.avgAprovPct))
      .catch(() => setAvgAprovPct(null))
  }, [])

  const cravadas   = useMemo(() => getCravadas(matches, predictions), [matches, predictions])
  const boldest    = useMemo(() => getBoldestPick(matches, predictions), [matches, predictions])
  const streak     = useMemo(() => getBestStreak(matches, predictions), [matches, predictions])
  const evolution  = useMemo(() => getPointsEvolution(matches, predictions), [matches, predictions])
  const bestPhase  = useMemo(() => getBestPhase(matches, predictions), [matches, predictions])
  const aprov      = useMemo(() => getAproveitamento(matches, predictions), [matches, predictions])
  const myEntry    = useMemo(() => ranking.find(r => r.userId === user?.id) ?? null, [ranking, user?.id])

  const rankingCravadas = useMemo(() =>
    [...ranking]
      .sort((a, b) => b.cravadas - a.cravadas || b.points - a.points)
      .map((e, i) => ({ ...e, position: i + 1 })),
    [ranking]
  )
  const myCravadasEntry = useMemo(
    () => rankingCravadas.find(r => r.userId === user?.id) ?? null,
    [rankingCravadas, user?.id]
  )

  const pointsPercentile = myEntry ? getPercentile(myEntry.position, ranking.length) : null
  const cravadasPercentile = myCravadasEntry ? getPercentile(myCravadasEntry.position, rankingCravadas.length) : null

  const fidelity = useMemo(() => getFidelity(predictions), [predictions])
  const upsetCall = useMemo(() => getUpsetCall(matches, predictions, groups), [matches, predictions, groups])
  const avgPredictedGoals = useMemo(() => getAvgPredictedGoals(predictions), [predictions])
  const finishedCount = aprov.cravadas + aprov.certos + aprov.parciais + aprov.erros
  const nickname = useMemo(() => getNickname({
    cravadasCount: cravadas.length,
    cravadasPosition: myCravadasEntry?.position ?? null,
    aprovPct: aprov.aprovPct,
    avgAprovPct,
    finishedCount,
    hasUpsetCall: upsetCall !== null,
    bestStreakLength: streak.length,
    fidelity,
    boldestTotalGoals: boldest?.totalGoals ?? null,
    avgPredictedGoals,
    bestPhaseIsGroupStage: bestPhase ? bestPhase.phase === 'group_stage' : null,
  }), [cravadas.length, myCravadasEntry, aprov.aprovPct, avgAprovPct, finishedCount, upsetCall, streak.length, fidelity, boldest, avgPredictedGoals, bestPhase])

  function handleExit() {
    const from = (location.state as { from?: string } | null)?.from
    navigate(from && from !== '/wrapped' ? from : '/home', { replace: true })
  }

  const scenes: Scene[] = useMemo(() => {
    const list: (Scene | null)[] = [
      { id: 'intro', durationMs: Infinity, render: () => <IntroScene name={user?.name} /> },
      ranking.length > 0  ? { id: 'hype', durationMs: 4200, render: () => <PodiumHypeScene /> } : null,
      ranking.length >= 3 ? { id: 'p3', durationMs: 7000, render: () => <PodiumScene place={3} entry={ranking[2]} meId={user?.id ?? null} /> } : null,
      ranking.length >= 2 ? { id: 'p2', durationMs: 8100, render: () => <PodiumScene place={2} entry={ranking[1]} meId={user?.id ?? null} /> } : null,
      ranking.length >= 1 ? { id: 'p1', durationMs: 9600, render: () => <PodiumScene place={1} entry={ranking[0]} meId={user?.id ?? null} /> } : null,
      ranking.length > 0  ? { id: 'ranking', durationMs: 8500, render: () => <RankingScene ranking={ranking} meId={user?.id ?? null} variant="pontos" /> } : null,
      rankingCravadas.length > 0 ? { id: 'ranking-cravadas', durationMs: 8500, render: () => <RankingScene ranking={rankingCravadas} meId={user?.id ?? null} variant="cravadas" /> } : null,
      { id: 'cravadas', render: () => <CravadasScene hits={cravadas} /> },
      { id: 'apelido', durationMs: 6500, render: () => <NicknameScene nickname={nickname} /> },
      { id: 'ousado', render: () => <BoldestScene pick={boldest} /> },
      { id: 'streak', render: () => <StreakScene streak={streak} /> },
      { id: 'evolucao', render: () => <EvolutionScene points={evolution} /> },
      { id: 'fase', render: () => <BestPhaseScene phase={bestPhase} /> },
      { id: 'aprov', render: () => <AproveitamentoScene stats={aprov} /> },
      avgAprovPct !== null ? {
        id: 'comparacao',
        render: () => (
          <ComparisonScene
            aprovPct={aprov.aprovPct}
            avgAprovPct={avgAprovPct}
            pointsPercentile={pointsPercentile}
            cravadasPercentile={cravadasPercentile}
          />
        ),
      } : null,
      { id: 'outro', durationMs: Infinity, render: () => <OutroScene user={user} myEntry={myEntry} onClose={handleExit} /> },
    ]
    return list.filter((sc): sc is Scene => sc !== null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user, ranking, rankingCravadas, cravadas, boldest, streak, evolution, bestPhase, aprov, myEntry,
    avgAprovPct, pointsPercentile, cravadasPercentile, nickname,
  ])

  return <StoryViewer scenes={scenes} onExit={handleExit} />
}
