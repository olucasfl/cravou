import { NavLink } from 'react-router-dom'
import { Home, Calendar, Trophy, BarChart2, User } from 'lucide-react'
import s from './BottomNav.module.css'

const items = [
  { to: '/home',    icon: Home,      label: 'Início' },
  { to: '/matches', icon: Calendar,  label: 'Jogos' },
  { to: '/ranking', icon: BarChart2, label: 'Ranking' },
  { to: '/profile', icon: User,      label: 'Perfil' },
]

export default function BottomNav() {
  return (
    <nav className={s.nav}>
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `${s.item} ${isActive ? s.active : ''}`}
        >
          {({ isActive }) => (
            <>
              <div className={s.icon}>
                <Icon size={22} strokeWidth={2} />
                {isActive && <span className={s.dot} />}
              </div>
              <span className={s.label}>{label}</span>
            </>
          )}
        </NavLink>
      ))}

      {/* Copa — em desenvolvimento, sem navegação */}
      <button className={`${s.item} ${s.itemDisabled}`} onClick={() => {}}>
        <div className={s.icon}>
          <Trophy size={22} strokeWidth={2} />
        </div>
        <span className={s.label}>
          Copa
          <span className={s.testeBadge}>Teste</span>
        </span>
      </button>
    </nav>
  )
}
