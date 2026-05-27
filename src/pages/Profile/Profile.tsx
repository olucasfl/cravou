import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Shield, BarChart2, LogOut } from 'lucide-react'
import { getMe, logout, type User } from '@/services/authService'
import { getRanking, getMyPredictions, type Prediction } from '@/services/cravouService'
import s from './Profile.module.css'

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [myPosition, setMyPosition] = useState<number | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])

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
    }
    load()
  }, [])

  const totalPalp  = predictions.length
  const pontuaram  = predictions.filter((p) => p.points !== null && p.points > 0).length
  const aprovPct   = totalPalp > 0 ? Math.round((pontuaram / totalPalp) * 100) : 0

  return (
    <div className="app-layout">
      <div className="page fade-up">
        {/* Header */}
        <div className={s.header}>
          <div className={s.avatar}>
            {user?.name.slice(0, 2).toUpperCase() ?? '?'}
          </div>
          <div className={s.name}>{user?.name ?? '...'}</div>
          <div className={s.email}>{user?.email ?? ''}</div>
          {user?.isAdmin && (
            <div className={s.adminBadge}>
              <span className="badge badge-gold">Admin</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className={s.statsRow}>
          <div className={s.statCard}>
            <div className={s.statValue}>{user?.bolaoPoints ?? 0}</div>
            <div className={s.statLabel}>Pontos</div>
          </div>
          <div className={`${s.statCard} ${s.statCardCravas}`}>
            <div className={`${s.statValue} ${s.statValueCravas}`}>{user?.cravadas ?? 0}</div>
            <div className={s.statLabel}>Cravadas</div>
          </div>
          <div className={s.statCard}>
            <div className={s.statValue}>{myPosition ? `#${myPosition}` : '—'}</div>
            <div className={s.statLabel}>Posição</div>
          </div>
        </div>

        {/* Palpite stats */}
        {totalPalp > 0 && (
          <div className={s.palpiteStats}>
            <div className={s.palpiteStat}>
              <span className={s.palpiteVal}>{totalPalp}</span>
              <span className={s.palpiteLbl}>palpites</span>
            </div>
            <div className={s.palpiteDivider} />
            <div className={s.palpiteStat}>
              <span className={s.palpiteVal}>{pontuaram}</span>
              <span className={s.palpiteLbl}>pontuaram</span>
            </div>
            <div className={s.palpiteDivider} />
            <div className={s.palpiteStat}>
              <span className={`${s.palpiteVal} ${aprovPct >= 50 ? s.palpiteGood : ''}`}>{aprovPct}%</span>
              <span className={s.palpiteLbl}>aproveit.</span>
            </div>
          </div>
        )}

        {/* Menu */}
        <div className={s.section}>
          <Link to="/ranking" className={s.menuItem}>
            <div className={s.menuIcon} style={{ background: 'var(--c-accent-glow)' }}>
              <BarChart2 size={18} color="var(--c-accent)" />
            </div>
            <span className={s.menuLabel}>Ver ranking</span>
            <ChevronRight size={16} className={s.menuChevron} />
          </Link>

          {user?.isAdmin && (
            <Link to="/admin" className={s.menuItem}>
              <div className={s.menuIcon} style={{ background: 'var(--c-gold-glow)' }}>
                <Shield size={18} color="var(--c-gold)" />
              </div>
              <span className={s.menuLabel}>Painel admin</span>
              <ChevronRight size={16} className={s.menuChevron} />
            </Link>
          )}
        </div>

        <button className={`btn btn-outline ${s.logoutBtn}`} onClick={logout}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    </div>
  )
}
