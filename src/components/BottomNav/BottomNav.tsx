import { NavLink } from 'react-router-dom'
import { Home, Calendar, BarChart2, User, Users } from 'lucide-react'
import { usePendingInviteCount } from '@/hooks/usePendingInviteCount'
import s from './BottomNav.module.css'

const items = [
  { to: '/home',    icon: Home,      label: 'Início' },
  { to: '/bolao',   icon: Users,     label: 'Grupos' },
  { to: '/matches', icon: Calendar,  label: 'Jogos' },
  { to: '/ranking', icon: BarChart2, label: 'Ranking' },
  { to: '/profile', icon: User,      label: 'Perfil' },
]

export default function BottomNav() {
  const { count } = usePendingInviteCount()

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
                {to === '/bolao' && count > 0 && (
                  <span className={s.badge}>{count > 9 ? '9+' : count}</span>
                )}
              </div>
              <span className={s.label}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
