import { Flame } from 'lucide-react'
import type { BoldestPick } from '@/utils/wrappedStats'
import s from './scenes.module.css'

interface Props {
  pick: BoldestPick | null
}

export default function BoldestScene({ pick }: Props) {
  if (!pick) {
    return (
      <div className={s.card}>
        <div className={s.icon}><Flame size={26} /></div>
        <div className={s.eyebrow}>Placar mais ousado</div>
        <div className={s.empty}>Você não deu nenhum palpite dessa vez.</div>
      </div>
    )
  }

  return (
    <div className={s.card}>
      <div className={s.icon}><Flame size={26} /></div>
      <div className={s.eyebrow}>Seu placar mais ousado</div>
      <div className={s.bigNumber}>{pick.predictedHome}-{pick.predictedAway}</div>
      <div className={s.headline}>{pick.homeTeam} x {pick.awayTeam}</div>
      <div className={s.subtitle}>{pick.totalGoals} gols no palpite — você não teve medo de arriscar!</div>
    </div>
  )
}
