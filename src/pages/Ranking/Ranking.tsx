import { useMemo, useState } from 'react'
import { Trophy, Crown, Target, List } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { avatarInitial, avatarColor, LELE_ID } from '@/utils/palpitesConfig'
import PullToRefresh from '@/components/PullToRefresh/PullToRefresh'
import GlobalPalpitesTab, { clearGlobalPalpitesCache } from './GlobalPalpitesTab'
import s from './Ranking.module.css'

type Tab = 'pontos' | 'cravadas' | 'palpites'

export default function Ranking() {
  const { ranking: rankingPontos, user, loading, refresh } = useAppData()
  const [tab, setTab] = useState<Tab>('pontos')
  const [palpitesKey, setPalpitesKey] = useState(0)

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

  const myEntry = useMemo(() => ranking.find(e => e.userId === myId) ?? null, [ranking, myId])
  const showMyBanner = !loading && tab !== 'palpites' && myEntry !== null && myEntry.position > 3

  async function handleRefresh() {
    if (tab === 'palpites') {
      clearGlobalPalpitesCache()
      setPalpitesKey(k => k + 1)
    }
    await refresh()
  }

  function getVal(e: typeof ranking[0]) {
    return isCravas ? (e.cravadas ?? 0) : e.points
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="app-layout">
        <div className="page fade-up">

          {/* Header */}
          <div className={s.titleRow}>
            <div className={s.title}>Ranking</div>
            {!loading && ranking.length > 0 && tab !== 'palpites' && (
              <span className={s.participantCount}>{ranking.length} participantes</span>
            )}
          </div>

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
              <List size={14} /> Palpites
            </button>
          </div>

          {tab === 'palpites' && <GlobalPalpitesTab key={palpitesKey} />}

          {/* Loading skeleton */}
          {tab !== 'palpites' && loading && (
            <div className={s.skeletonList}>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className={s.skeletonItem}>
                  <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: i <= 3 ? '70%' : '55%', height: 13, borderRadius: 99, marginBottom: 6 }} />
                    <div className="skeleton" style={{ width: 50, height: 10, borderRadius: 99 }} />
                  </div>
                  <div className="skeleton" style={{ width: 44, height: 22, borderRadius: 99, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && tab !== 'palpites' && ranking.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyIcon}><Trophy size={40} /></div>
              <div className={s.emptyTitle}>Nenhum palpite pontuado ainda</div>
              <div className={s.emptySub}>O ranking aparecerá quando as partidas forem encerradas</div>
            </div>
          )}

          {/* Minha posição — só aparece quando o usuário está fora do pódio */}
          {showMyBanner && myEntry && (
            <div className={`${s.myPositionBanner} ${isCravas ? s.myPositionBannerCravas : ''}`}>
              <div className={s.myPositionLeft}>
                <span className={s.myPositionRank}>#{myEntry.position}</span>
                <span className={s.myPositionLabel}>Você</span>
              </div>
              <div className={s.myPositionRight}>
                <span className={`${s.myPositionVal} ${isCravas ? s.myPositionValCravas : ''}`}>
                  {isCravas ? (myEntry.cravadas ?? 0) : myEntry.points}
                </span>
                <span className={s.myPositionUnit}>{isCravas ? 'cravadas' : 'pts'}</span>
              </div>
            </div>
          )}

          {/* Pódio */}
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
                    <div className={s.podiumAvatarWrap}>
                      <div className={`${s.podiumAvatar} ${idx === 0 ? firstCls : ''} ${e.userId === myId ? s.podiumAvatarMe : ''} ${e.userId === LELE_ID ? 'lele-avatar' : ''}`}>
                        {avatarInitial(e.name)}
                      </div>
                      {e.userId === myId && <div className={s.podiumMeBadge}>Você</div>}
                    </div>
                    <div className={s.podiumName}>{e.name}</div>
                    <div className={`${s.podiumPts} ${idx === 0 && isCravas ? s.podiumPtsCravas : ''}`}>
                      {getVal(e)}
                    </div>
                    <div className={s.podiumPtsLabel}>{isCravas ? 'cravadas' : 'pts'}</div>
                    <div className={`${s.podiumBar} ${idx === 0 && isCravas ? s.podiumBarCravas : ''}`}>
                      <span className={s.podiumBarPos}>{idx + 1}º</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Lista */}
          {!loading && tab !== 'palpites' && ranking.length > 0 && (
            <div className={s.list}>
              {listItems.map((e) => (
                <div key={e.userId} className={`${s.item} ${e.userId === myId ? (isCravas ? s.meCravas : s.me) : ''}`}>
                  <div className={s.pos}>#{e.position}</div>
                  <div
                    className={`${s.avatar} ${e.userId === LELE_ID ? 'lele-avatar' : ''}`}
                    style={{ background: avatarColor(e.userId), color: '#000' }}
                  >
                    {avatarInitial(e.name)}
                  </div>
                  <div className={s.name}>{e.name}{e.userId === myId ? ' (você)' : ''}</div>
                  <div className={s.ptsBlock}>
                    <div className={`${s.pts} ${isCravas ? s.ptsCravas : ''}`}>{getVal(e)}</div>
                    <div className={s.ptsLabel}>{isCravas ? 'cravadas' : 'pts'}</div>
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
