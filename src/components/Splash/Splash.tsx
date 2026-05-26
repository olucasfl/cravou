import { Trophy } from 'lucide-react'
import s from './Splash.module.css'

export default function Splash() {
  return (
    <div className={s.splash}>
      <div className={s.icon}>
        <Trophy size={44} />
      </div>
      <div className={s.title}>CRAVOU!</div>
      <div className={s.sub}>Copa do Mundo 2026</div>
      <div className={s.dots}>
        <div className={s.dot} />
        <div className={s.dot} />
        <div className={s.dot} />
      </div>
    </div>
  )
}
