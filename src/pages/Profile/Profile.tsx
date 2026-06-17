import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Shield, BarChart2, LogOut, Target, CheckCircle2, XCircle, Trophy, Minus } from 'lucide-react'
import { getMe, logout, type User } from '@/services/authService'
import { getRanking, getMyPredictions, type Prediction } from '@/services/cravouService'
import { useAppData } from '@/context/AppDataContext'
import { getPredCategory } from '@/utils/format'
import { SoccerBall } from '@/components/icons/SoccerBall'
import s from './Profile.module.css'

export default function Profile() {
  const [user, setUser]           = useState<User | null>(null)
  const [myPosition, setMyPosition] = useState<number | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading]     = useState(true)

  const { matches } = useAppData()

  useEffect(() => {
    async function load() {
      const [u, ranking, preds] = await Promise.all([
        getMe().catch(() => null),
        getRanking().catch(() => []),
        getMyPredictions().catch(() => []),
      ])
      setUser(u)
      setPredictions(preds)
      if (u) {
        const entry = ranking.find((r) => r.userId === u.id)
        setMyPosition(entry?.position ?? null)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Total de jogos já encerrados (com resultado) independente de palpite
  const totalFinished = matches.filter(m => m.status === 'finished').length

  // Palpites em jogos já encerrados (têm pontuação)
  const finished = predictions.filter(p => p.points !== null)
  const total    = predictions.length

  // Categorização correta usando a fase do jogo
  const matchMap = new Map(matches.map(m => [m.id, m]))
  const cat = (p: Prediction) => getPredCategory(p.points, true, matchMap.get(p.matchId)?.phase)
  const cravadas = finished.filter(p => cat(p) === 'exact').length
  const certos   = finished.filter(p => cat(p) === 'bonus' || cat(p) === 'right').length
  const parciais = finished.filter(p => cat(p) === 'partial').length
  const erros    = finished.filter(p => cat(p) === 'wrong').length
  // Jogos encerrados onde o usuário não palpitou
  const missed   = Math.max(0, totalFinished - finished.length)

  const pontuaram = finished.filter(p => (p.points ?? 0) > 0).length
  const aprovPct  = finished.length > 0 ? Math.round((pontuaram / finished.length) * 100) : 0

  // Barra usa totalFinished como base para incluir os "sem palpite"
  const pct = (n: number) => totalFinished > 0 ? (n / totalFinished) * 100 : 0

  const initials = user?.name?.slice(0, 2).toUpperCase() ?? '?'

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
    <div className="app-layout">
      <div className="page fade-up">

        {/* ── Header ── */}
        <div className={s.header}>
          <div className={s.avatarWrap}>
            <div className={s.avatar}>{initials}</div>
            {user?.isAdmin && <span className={s.adminDot} title="Admin" />}
          </div>
          <div className={s.name}>{user?.name ?? '...'}</div>
          <div className={s.email}>{user?.email ?? ''}</div>
          {user?.isAdmin && <span className={`badge badge-gold ${s.adminBadge}`}>Admin</span>}
        </div>

        {/* ── Stats grid 2×2 ── */}
        <div className={s.statsGrid}>
          <div className={`${s.statCard} ${s.statCardPts}`}>
            <div className={`${s.statValue} ${s.statValuePts}`}>{user?.bolaoPoints ?? 0}</div>
            <div className={s.statLabel}>Pontos no bolão</div>
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

            {/* Barra segmentada — base = totalFinished, inclui sem palpite */}
            <div className={s.perfBar}>
              {cravadas > 0 && <div className={`${s.perfSeg} ${s.segExact}`}   style={{ width: `${pct(cravadas)}%` }} />}
              {certos   > 0 && <div className={`${s.perfSeg} ${s.segRight}`}   style={{ width: `${pct(certos)}%` }} />}
              {parciais > 0 && <div className={`${s.perfSeg} ${s.segPartial}`} style={{ width: `${pct(parciais)}%` }} />}
              {erros    > 0 && <div className={`${s.perfSeg} ${s.segWrong}`}   style={{ width: `${pct(erros)}%` }} />}
              {missed   > 0 && <div className={`${s.perfSeg} ${s.segMissed}`}  style={{ width: `${pct(missed)}%` }} />}
            </div>

            {/* Legenda */}
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

            {/* Aproveitamento */}
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

        {/* ── Palpites pendentes (feitos em jogos que ainda não encerraram) ── */}
        {total > finished.length && (
          <div className={s.pendingRow}>
            <span className={s.pendingDot} />
            <span>{total - finished.length} palpite{total - finished.length > 1 ? 's' : ''} aguardando resultado</span>
          </div>
        )}

        {/* ── Menu ── */}
        <div className={s.section}>
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
  )
}
