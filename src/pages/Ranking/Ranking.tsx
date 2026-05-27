import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trophy, Crown, Target } from 'lucide-react'
import { getRanking, type RankingEntry } from '@/services/cravouService'
import { getMe } from '@/services/authService'
import { useSocketEvent } from '@/hooks/useSocketEvent'
import s from './Ranking.module.css'

type Tab = 'pontos' | 'cravadas'

export default function Ranking() {
  const [tab, setTab] = useState<Tab>('pontos')
  const [rankingPontos, setRankingPontos] = useState<RankingEntry[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [rPts, me] = await Promise.all([
      getRanking().catch(() => []),
      getMe().catch(() => null),
    ])
    setRankingPontos(rPts)
    setMyId(me?.id ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useSocketEvent('ranking:updated', load)

  const rankingCravas = useMemo(() =>
    [...rankingPontos]
      .sort((a, b) => b.cravadas - a.cravadas || b.points - a.points)
      .map((e, i) => ({ ...e, position: i + 1 })),
    [rankingPontos]
  )

  const ranking = tab === 'pontos' ? rankingPontos : rankingCravas
  const isCravas = tab === 'cravadas'

  const showPodium = ranking.length >= 3
  const top3 = ranking.slice(0, 3)
  const listItems = showPodium ? ranking.slice(3) : ranking

  function getVal(e: RankingEntry) {
    return isCravas ? (e.cravadas ?? 0) : e.points
  }
  function getLabel() {
    return isCravas ? 'cravadas' : 'pts'
  }

  return (
    <div className="app-layout">
      <div className="page fade-up">
        <div className={s.title}>Ranking</div>

        {/* Tabs */}
        <div className={s.tabs}>
          <button
            className={`${s.tab} ${tab === 'pontos' ? s.tabActive : ''}`}
            onClick={() => setTab('pontos')}
          >
            <Trophy size={14} /> Pontos
          </button>
          <button
            className={`${s.tab} ${tab === 'cravadas' ? s.tabActiveCravas : ''}`}
            onClick={() => setTab('cravadas')}
          >
            <Target size={14} /> Cravadas
          </button>
        </div>

        {loading && [1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8 }} />
        ))}

        {!loading && ranking.length === 0 && (
          <div className={s.empty}>
            <div className={s.emptyIcon}><Trophy size={40} /></div>
            <div className={s.emptyTitle}>Nenhum palpite pontuado ainda</div>
            <div className={s.emptySub}>O ranking aparecerá quando as partidas forem encerradas</div>
          </div>
        )}

        {!loading && showPodium && (
          <div className={s.podium}>
            {[1, 0, 2].map((idx) => {
              const e = top3[idx]
              if (!e) return null
              const cls = idx === 0 ? s.first : idx === 1 ? s.second : s.third
              const firstCls = isCravas ? s.firstCravas : ''
              return (
                <div key={e.userId} className={`${s.podiumItem} ${cls}`}>
                  {idx === 0 && (
                    <div className={s.podiumCrown}>
                      {isCravas
                        ? <Target size={18} color="var(--c-accent)" />
                        : <Crown size={18} color="var(--c-gold)" />
                      }
                    </div>
                  )}
                  <div className={`${s.podiumAvatar} ${idx === 0 ? firstCls : ''}`}>
                    {e.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className={s.podiumName}>{e.name}{e.userId === myId ? ' (você)' : ''}</div>
                  <div className={`${s.podiumPts} ${idx === 0 && isCravas ? s.podiumPtsCravas : ''}`}>
                    {getVal(e)}
                  </div>
                  <div className={s.podiumPtsLabel}>{getLabel()}</div>
                  <div className={`${s.podiumBar} ${idx === 0 && isCravas ? s.podiumBarCravas : ''}`} />
                </div>
              )
            })}
          </div>
        )}

        {!loading && ranking.length > 0 && (
          <div className={s.list}>
            {listItems.map((e) => (
              <div key={e.userId} className={`${s.item} ${e.userId === myId ? (isCravas ? s.meCravas : s.me) : ''}`}>
                <div className={s.pos}>#{e.position}</div>
                <div className={s.avatar}>{e.name.slice(0, 2).toUpperCase()}</div>
                <div className={s.name}>{e.name}{e.userId === myId ? ' (você)' : ''}</div>
                <div className={s.ptsBlock}>
                  <div className={`${s.pts} ${isCravas ? s.ptsCravas : ''}`}>{getVal(e)}</div>
                  <div className={s.ptsLabel}>{getLabel()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
