import { Percent } from 'lucide-react'
import type { AproveitamentoStats } from '@/utils/wrappedStats'
import { useCountUp } from '@/hooks/useCountUp'
import s from './scenes.module.css'
import ss from './AproveitamentoScene.module.css'

interface Props {
  stats: AproveitamentoStats
}

export default function AproveitamentoScene({ stats }: Props) {
  const pct = useCountUp(stats.aprovPct)
  const finishedTotal = stats.cravadas + stats.certos + stats.parciais + stats.erros
  const segWidth = (n: number) => finishedTotal > 0 ? `${(n / finishedTotal) * 100}%` : '0%'

  if (finishedTotal === 0) {
    return (
      <div className={s.card}>
        <div className={s.icon}><Percent size={26} /></div>
        <div className={s.eyebrow}>Aproveitamento</div>
        <div className={s.empty}>Ainda não há palpites pontuados pra calcular seu aproveitamento.</div>
      </div>
    )
  }

  return (
    <div className={s.card}>
      <div className={s.icon}><Percent size={26} /></div>
      <div className={s.eyebrow}>Aproveitamento geral</div>
      <div className={s.bigNumber}>{pct}%</div>
      <div className={s.headline}>dos seus palpites pontuaram</div>

      <div className={ss.bar}>
        {stats.cravadas > 0 && <div className={`${ss.seg} ${ss.exact}`} style={{ width: segWidth(stats.cravadas) }} />}
        {stats.certos   > 0 && <div className={`${ss.seg} ${ss.right}`} style={{ width: segWidth(stats.certos) }} />}
        {stats.parciais > 0 && <div className={`${ss.seg} ${ss.partial}`} style={{ width: segWidth(stats.parciais) }} />}
        {stats.erros    > 0 && <div className={`${ss.seg} ${ss.wrong}`} style={{ width: segWidth(stats.erros) }} />}
      </div>

      <div className={ss.legend}>
        <span><b className={ss.dotExact} />{stats.cravadas} cravadas</span>
        <span><b className={ss.dotRight} />{stats.certos} certos</span>
        <span><b className={ss.dotPartial} />{stats.parciais} parciais</span>
        <span><b className={ss.dotWrong} />{stats.erros} erros</span>
      </div>
    </div>
  )
}
