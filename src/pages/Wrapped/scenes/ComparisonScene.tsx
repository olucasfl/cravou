import { Users } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import s from './scenes.module.css'
import ss from './ComparisonScene.module.css'

interface Props {
  aprovPct: number
  avgAprovPct: number
  pointsPercentile: number | null
  cravadasPercentile: number | null
}

export default function ComparisonScene({ aprovPct, avgAprovPct, pointsPercentile, cravadasPercentile }: Props) {
  const you = useCountUp(aprovPct)
  const avg = useCountUp(avgAprovPct)
  const diff = aprovPct - avgAprovPct

  let highlight: string | null = null
  if (pointsPercentile !== null && cravadasPercentile !== null) {
    if (pointsPercentile > cravadasPercentile + 5) highlight = 'Você se destacou mais nos pontos gerais.'
    else if (cravadasPercentile > pointsPercentile + 5) highlight = 'Você se destacou mais cravando placares.'
    else highlight = 'Você foi consistente tanto em pontos quanto em cravadas.'
  }

  return (
    <div className={s.card}>
      <div className={s.icon}><Users size={26} /></div>
      <div className={s.eyebrow}>Você x o resto da galera</div>

      <div className={ss.compareRow}>
        <div className={ss.compareItem}>
          <div className={`${ss.compareVal} ${ss.you}`}>{you}%</div>
          <div className={ss.compareLabel}>você</div>
        </div>
        <div className={ss.vs}>vs</div>
        <div className={ss.compareItem}>
          <div className={ss.compareVal}>{avg}%</div>
          <div className={ss.compareLabel}>média geral</div>
        </div>
      </div>

      <div className={s.subtitle}>
        {diff > 0
          ? `Seu aproveitamento ficou ${diff} pontos acima da média — mandou bem!`
          : diff < 0
            ? `Seu aproveitamento ficou ${Math.abs(diff)} pontos abaixo da média dessa vez.`
            : 'Seu aproveitamento ficou exatamente na média da galera.'}
      </div>

      {pointsPercentile !== null && (
        <div className={ss.percentile}>
          Você superou <b>{pointsPercentile}%</b> dos jogadores em pontos
        </div>
      )}

      {highlight && <div className={ss.highlight}>{highlight}</div>}
    </div>
  )
}
