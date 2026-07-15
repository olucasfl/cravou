import { Award } from 'lucide-react'
import type { PhaseBreakdown } from '@/utils/wrappedStats'
import { useCountUp } from '@/hooks/useCountUp'
import s from './scenes.module.css'

interface Props {
  phase: PhaseBreakdown | null
}

export default function BestPhaseScene({ phase }: Props) {
  const count = useCountUp(phase?.totalPoints ?? 0)

  if (!phase) {
    return (
      <div className={s.card}>
        <div className={s.icon}><Award size={26} /></div>
        <div className={s.eyebrow}>Melhor fase</div>
        <div className={s.empty}>Nenhum palpite pontuado ainda pra destacar uma fase.</div>
      </div>
    )
  }

  return (
    <div className={s.card}>
      <div className={s.icon}><Award size={26} /></div>
      <div className={s.eyebrow}>Sua melhor fase</div>
      <div className={s.headline}>{phase.label}</div>
      <div className={s.bigNumber}>{count}</div>
      <div className={s.subtitle}>
        pontos em {phase.matchesCount} {phase.matchesCount === 1 ? 'jogo' : 'jogos'} pontuados
      </div>
    </div>
  )
}
