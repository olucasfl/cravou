import { useEffect, useRef } from 'react'
import type { RankingEntry } from '@/services/cravouService'
import { avatarInitial } from '@/utils/palpitesConfig'
import s from './RankingScene.module.css'

type Variant = 'pontos' | 'cravadas'

interface Props {
  ranking: RankingEntry[]
  meId: string | null
  variant?: Variant
}

const EYEBROW: Record<Variant, string> = { pontos: 'Ranking Final', cravadas: 'Ranking de Cravadas' }
const BANNER: Record<Variant, string> = { pontos: 'Você terminou em', cravadas: 'Você ficou em' }
const UNIT: Record<Variant, string> = { pontos: 'pts', cravadas: 'cravadas' }

export default function RankingScene({ ranking, meId, variant = 'pontos' }: Props) {
  const meRef = useRef<HTMLDivElement | null>(null)
  const myEntry = ranking.find(e => e.userId === meId) ?? null
  const isCravadas = variant === 'cravadas'
  const getVal = (e: RankingEntry) => isCravadas ? e.cravadas : e.points

  useEffect(() => {
    const t = setTimeout(() => {
      meRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 700)
    return () => clearTimeout(t)
  }, [meId])

  return (
    <div className={`${s.wrap} ${isCravadas ? s.cravadasVariant : ''}`}>
      <div className={s.header}>
        <div className={s.eyebrow}>{EYEBROW[variant]}</div>
        {myEntry && (
          <div className={s.myBanner}>
            {BANNER[variant]} <b>{myEntry.position}º lugar</b> em {UNIT[variant]}
          </div>
        )}
      </div>

      <div className={s.list}>
        {ranking.map((e, i) => {
          const isMe = e.userId === meId
          return (
            <div
              key={e.userId}
              ref={isMe ? meRef : undefined}
              className={`${s.item} ${isMe ? s.me : ''}`}
              style={{ animationDelay: `${Math.min(i, 14) * 0.04}s` }}
            >
              <div className={s.pos}>#{e.position}</div>
              <div className={s.avatar}>{avatarInitial(e.name)}</div>
              <div className={s.name}>{e.name}{isMe ? ' (você)' : ''}</div>
              <div className={s.pts}>{getVal(e)} <span>{UNIT[variant]}</span></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
