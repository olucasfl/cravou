import type { NicknameResult } from '@/utils/wrappedStats'
import s from './scenes.module.css'
import ss from './NicknameScene.module.css'

interface Props {
  nickname: NicknameResult
}

export default function NicknameScene({ nickname }: Props) {
  return (
    <div className={s.card}>
      <div className={s.eyebrow}>Seu apelido da Copa</div>
      <div className={ss.badge}>
        <span className={ss.badgeEmoji}>{nickname.emoji}</span>
      </div>
      <div className={ss.title}>{nickname.title}</div>
      <div className={s.subtitle}>{nickname.blurb}</div>
    </div>
  )
}
