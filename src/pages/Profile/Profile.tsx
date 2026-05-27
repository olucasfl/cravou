import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Shield, BarChart2, LogOut } from 'lucide-react'
import { getMe, logout, type User } from '@/services/authService'
import { getRanking } from '@/services/cravouService'
import s from './Profile.module.css'

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [myPosition, setMyPosition] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const [u, ranking] = await Promise.all([
        getMe().catch(() => null),
        getRanking().catch(() => []),
      ])
      setUser(u)
      if (u) {
        const entry = ranking.find((r) => r.userId === u.id)
        setMyPosition(entry?.position ?? null)
      }
    }
    load()
  }, [])

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
          <div className={s.statCard}>
            <div className={s.statValue}>{myPosition ? `#${myPosition}` : '—'}</div>
            <div className={s.statLabel}>Posição</div>
          </div>
        </div>

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
