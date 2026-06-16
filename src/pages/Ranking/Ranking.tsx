import { useMemo, useState } from 'react'
import { Trophy, Crown, Target } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import PullToRefresh from '@/components/PullToRefresh/PullToRefresh'
import GlobalPalpitesTab from './GlobalPalpitesTab'
import s from './Ranking.module.css'

type Tab = 'pontos' | 'cravadas' | 'palpites'

export default function Ranking() {
  const { ranking: rankingPontos, user, loading, refresh } = useAppData()
  const [tab, setTab] = useState<Tab>('pontos')

  const myId = user?.id ?? null

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

  function getVal(e: typeof ranking[0]) {
    return isCravas ? (e.cravadas ?? 0) : e.points
  }
  function getLabel() {
    return isCravas ? 'cravadas' : 'pts'
  }

  return (
    <PullToRefresh onRefresh={refresh}>
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
            <button
              className={`${s.tab} ${tab === 'palpites' ? s.tabActivePalpites : ''}`}
              onClick={() => setTab('palpites')}
            >
              Palpites
            </button>
          </div>

          {tab === 'palpites' && <GlobalPalpitesTab />}

          {tab !== 'palpites' && loading && [1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: '10px 14px', marginBottom: 8 }}>
              <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
              <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: i <= 3 ? '70%' : '55%', height: 13, borderRadius: 99, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: 50, height: 10, borderRadius: 99 }} />
              </div>
              <div className="skeleton" style={{ width: 44, height: 22, borderRadius: 99, flexShrink: 0 }} />
            </div>
          ))}

          {!loading && tab !== 'palpites' && ranking.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyIcon}><Trophy size={40} /></div>
              <div className={s.emptyTitle}>Nenhum palpite pontuado ainda</div>
              <div className={s.emptySub}>O ranking aparecerá quando as partidas forem encerradas</div>
            </div>
          )}

          {!loading && tab !== 'palpites' && showPodium && (
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

          {!loading && tab !== 'palpites' && ranking.length > 0 && (
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
    </PullToRefresh>
  )
}
