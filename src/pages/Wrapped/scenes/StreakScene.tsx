import { Flame } from 'lucide-react'
import type { StreakResult } from '@/utils/wrappedStats'
import { useCountUp } from '@/hooks/useCountUp'
import s from './scenes.module.css'
import ss from './StreakScene.module.css'

interface Props {
  streak: StreakResult
}

export default function StreakScene({ streak }: Props) {
  const count = useCountUp(streak.length)

  if (streak.length <= 1) {
    return (
      <div className={s.card}>
        <div className={s.icon}><Flame size={26} /></div>
        <div className={s.eyebrow}>Sequência de acertos</div>
        <div className={s.empty}>Dessa vez não rolou uma sequência — o importante é participar!</div>
      </div>
    )
  }

  return (
    <div className={s.card}>
      <div className={s.icon}><Flame size={26} /></div>
      <div className={s.eyebrow}>Melhor sequência</div>
      <div className={s.bigNumber}>{count}</div>
      <div className={s.headline}>acertos seguidos</div>
      <div className={ss.dots}>
        {streak.hits.map((h, i) => (
          <span key={h.matchId} className={ss.dot} style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
    </div>
  )
}
