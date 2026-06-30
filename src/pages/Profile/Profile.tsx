import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Shield, BarChart2, LogOut, Target, CheckCircle2, XCircle, Trophy, Minus, Users } from 'lucide-react'
import { logout } from '@/services/authService'
import { useAppData } from '@/context/AppDataContext'
import { getPredCategory } from '@/utils/format'
import { avatarInitial, avatarColor, LELE_ID } from '@/utils/palpitesConfig'
import { SoccerBall } from '@/components/icons/SoccerBall'
import PullToRefresh from '@/components/PullToRefresh/PullToRefresh'
import s from './Profile.module.css'

export default function Profile() {
  const { user, matches, predictions, ranking, loading, refresh } = useAppData()

  const myPosition = ranking.find(r => r.userId === user?.id)?.position ?? null

  const totalFinished = useMemo(
    () => matches.filter(m => m.status === 'finished').length,
    [matches]
  )

  const matchMap = useMemo(() => new Map(matches.map(m => [m.id, m])), [matches])

  const stats = useMemo(() => {
    const finished = predictions.filter(p => p.points !== null)
    let cravadas = 0, certos = 0, parciais = 0, erros = 0
    for (const p of finished) {
      const phase = matchMap.get(p.matchId)?.phase ?? 'group_stage'
      const c = getPredCategory(p.points, true, phase)
      if (c === 'exact') cravadas++
      else if (c === 'bonus' || c === 'right') certos++
      else if (c === 'partial') parciais++
      else if (c === 'wrong') erros++
    }
    const total = predictions.length
    const missed = Math.max(0, totalFinished - finished.length)
    const pontuaram = finished.filter(p => (p.points ?? 0) > 0).length
    const aprovPct = finished.length > 0 ? Math.round((pontuaram / finished.length) * 100) : 0
    const pct = (n: number) => totalFinished > 0 ? (n / totalFinished) * 100 : 0
    return { finished, total, cravadas, certos, parciais, erros, missed, aprovPct, pct }
  }, [predictions, matchMap, totalFinished])

  const { finished, total, cravadas, certos, parciais, erros, missed, aprovPct, pct } = stats

  if (loading) return (
    <div className="app-layout">
      <div className="page fade-up">
        <div className={s.header}>
          <div className="skeleton" style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 12px' }} />
          <div className="skeleton" style={{ width: 160, height: 20, borderRadius: 99, margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ width: 200, height: 14, borderRadius: 99, margin: '0 auto' }} />
        </div>
        <div className={s.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 82, borderRadius: 16 }} />)}
        </div>
        <div className="skeleton" style={{ height: 140, borderRadius: 16, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 108, borderRadius: 16, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 44, borderRadius: 99, marginTop: 8 }} />
      </div>
    </div>
  )

  return (
    <PullToRefresh onRefresh={refresh}>
      <div className="app-layout">
        <div className="page fade-up">

          {/* ── Header ── */}
          <div className={s.header}>
            <div className={s.avatarWrap}>
              <div
                className={s.avatar}
                style={{ background: avatarColor(user?.id ?? ''), color: '#000' }}
              >
                {avatarInitial(user?.name ?? '')}
              </div>
              {user?.isAdmin && <span className={s.adminDot} title="Admin" />}
            </div>
            <div className={s.name}>{user?.name ?? '...'}</div>
            <div className={s.email}>{user?.email ?? ''}</div>
            {user?.isAdmin && <span className={`badge badge-gold ${s.adminBadge}`}>Admin</span>}
            {user?.id === LELE_ID && <span className={s.leleBadge}>💗 Especial</span>}
          </div>

          {/* ── Stats grid 2×2 ── */}
          <div className={s.statsGrid}>
            <div className={`${s.statCard} ${s.statCardPts}`}>
              <div className={`${s.statValue} ${s.statValuePts}`}>{user?.bolaoPoints ?? 0}</div>
              <div className={s.statLabel}>Pontos no ranking</div>
            </div>
            <div className={s.statCard}>
              <div className={s.statValue}>{myPosition ? `#${myPosition}` : '—'}</div>
              <div className={s.statLabel}>Posição ranking</div>
            </div>
            <div className={`${s.statCard} ${s.statCardCravas}`}>
              <div className={`${s.statValue} ${s.statValueCravas}`}>{user?.cravadas ?? 0}</div>
              <div className={s.statLabel}>Cravadas</div>
            </div>
            <div className={s.statCard}>
              <div className={s.statValue}>{total}</div>
              <div className={s.statLabel}>Palpites feitos</div>
            </div>
          </div>

          {/* ── Desempenho ── */}
          {finished.length > 0 ? (
            <div className={s.perfCard}>
              <div className={s.perfHeader}>
                <span className={s.perfTitle}>Desempenho</span>
                <span className={s.perfSub}>
                  {finished.length} de {totalFinished} jogos encerrados
                </span>
              </div>

              <div className={s.perfBar}>
                {cravadas > 0 && <div className={`${s.perfSeg} ${s.segExact}`}   style={{ width: `${pct(cravadas)}%` }} />}
                {certos   > 0 && <div className={`${s.perfSeg} ${s.segRight}`}   style={{ width: `${pct(certos)}%` }} />}
                {parciais > 0 && <div className={`${s.perfSeg} ${s.segPartial}`} style={{ width: `${pct(parciais)}%` }} />}
                {erros    > 0 && <div className={`${s.perfSeg} ${s.segWrong}`}   style={{ width: `${pct(erros)}%` }} />}
                {missed   > 0 && <div className={`${s.perfSeg} ${s.segMissed}`}  style={{ width: `${pct(missed)}%` }} />}
              </div>

              <div className={s.perfLegend}>
                <div className={s.perfLegendItem}>
                  <Target size={12} className={s.iconExact} />
                  <span className={s.perfLegendVal}>{cravadas}</span>
                  <span className={s.perfLegendLbl}>cravadas</span>
                </div>
                <div className={s.perfLegendItem}>
                  <CheckCircle2 size={12} className={s.iconRight} />
                  <span className={s.perfLegendVal}>{certos}</span>
                  <span className={s.perfLegendLbl}>certos</span>
                </div>
                <div className={s.perfLegendItem}>
                  <SoccerBall size={12} className={s.iconPartial} />
                  <span className={s.perfLegendVal}>{parciais}</span>
                  <span className={s.perfLegendLbl}>parciais</span>
                </div>
                <div className={s.perfLegendItem}>
                  <XCircle size={12} className={s.iconWrong} />
                  <span className={s.perfLegendVal}>{erros}</span>
                  <span className={s.perfLegendLbl}>erros</span>
                </div>
                {missed > 0 && (
                  <div className={s.perfLegendItem}>
                    <Minus size={12} className={s.iconMissed} />
                    <span className={s.perfLegendVal}>{missed}</span>
                    <span className={s.perfLegendLbl}>sem palpite</span>
                  </div>
                )}
              </div>

              <div className={s.aprovRow}>
                <span className={s.aprovLabel}>Aproveitamento nos palpites</span>
                <span className={`${s.aprovPct} ${aprovPct >= 60 ? s.aprovGood : aprovPct >= 40 ? s.aprovOk : s.aprovBad}`}>
                  {aprovPct}%
                </span>
              </div>
            </div>
          ) : total > 0 ? (
            <div className={s.perfCard}>
              <div className={s.perfHeader}>
                <span className={s.perfTitle}>Desempenho</span>
              </div>
              <div className={s.perfPending}>
                <Trophy size={28} className={s.perfPendingIcon} />
                <span>Aguardando encerramento dos jogos para calcular o desempenho.</span>
              </div>
            </div>
          ) : null}

          {/* ── Palpites pendentes — clicável ── */}
          {total > finished.length && (
            <Link to="/matches" className={s.pendingRow}>
              <span className={s.pendingDot} />
              <span>{total - finished.length} palpite{total - finished.length > 1 ? 's' : ''} aguardando resultado</span>
              <ChevronRight size={13} className={s.pendingChevron} />
            </Link>
          )}

          {/* ── Menu ── */}
          <div className={s.section}>
            <Link to="/bolao" className={s.menuItem}>
              <div className={s.menuIcon} style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
                <Users size={18} color="#a78bfa" />
              </div>
              <div className={s.menuInfo}>
                <span className={s.menuLabel}>Meus Bolões</span>
                <span className={s.menuSub}>Ver seus grupos e ranking</span>
              </div>
              <ChevronRight size={16} className={s.menuChevron} />
            </Link>

            <Link to="/ranking" className={s.menuItem}>
              <div className={s.menuIcon} style={{ background: 'var(--c-accent-glow)' }}>
                <BarChart2 size={18} color="var(--c-accent)" />
              </div>
              <div className={s.menuInfo}>
                <span className={s.menuLabel}>Ranking</span>
                <span className={s.menuSub}>Ver classificação geral</span>
              </div>
              <ChevronRight size={16} className={s.menuChevron} />
            </Link>

            {user?.isAdmin && (
              <Link to="/admin" className={s.menuItem}>
                <div className={s.menuIcon} style={{ background: 'var(--c-gold-glow)' }}>
                  <Shield size={18} color="var(--c-gold)" />
                </div>
                <div className={s.menuInfo}>
                  <span className={s.menuLabel}>Painel admin</span>
                  <span className={s.menuSub}>Gerenciar jogos e resultados</span>
                </div>
                <ChevronRight size={16} className={s.menuChevron} />
              </Link>
            )}
          </div>

          <button className={`btn btn-outline ${s.logoutBtn}`} onClick={logout}>
            <LogOut size={16} /> Sair da conta
          </button>

        </div>
      </div>
    </PullToRefresh>
  )
}
