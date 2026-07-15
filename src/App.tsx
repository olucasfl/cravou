import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'

import Splash from '@/components/Splash/Splash'
import ProtectedRoute from '@/components/ProtectedRoute'
import BottomNav from '@/components/BottomNav/BottomNav'
import { AppDataProvider, useAppData } from '@/context/AppDataContext'
import { hasSeenWrapped } from '@/utils/wrappedSeen'

import Login from '@/pages/Login/Login'
import Register from '@/pages/Register/Register'
import ResetPassword from '@/pages/ResetPassword/ResetPassword'
import Home from '@/pages/Home/Home'
import Matches from '@/pages/Matches/Matches'
import MatchDetail from '@/pages/MatchDetail/MatchDetail'
import Ranking from '@/pages/Ranking/Ranking'
import Groups from '@/pages/Groups/Groups'
import Bolao from '@/pages/Bolao/Bolao'
import BolaoDetail from '@/pages/Bolao/BolaoDetail'
import BolaoGrupoPalpites from '@/pages/Bolao/BolaoGrupoPalpites'
import Profile from '@/pages/Profile/Profile'
import Admin from '@/pages/Admin/Admin'
import Wrapped from '@/pages/Wrapped/Wrapped'
import LeleEffects from '@/components/LeleEffects/LeleEffects'

const APP_VERSION = 'v1'

const PUBLIC_ROUTES = ['/login', '/register', '/reset-password']

function isPublicPath() {
  return PUBLIC_ROUTES.some((r) => window.location.pathname.startsWith(r))
}

export default function App() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cache invalidation
    if (localStorage.getItem('cravou_version') !== APP_VERSION) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.setItem('cravou_version', APP_VERSION)
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (isStandalone && !isPublicPath()) {
      const t = setTimeout(() => setLoading(false), 800)
      return () => clearTimeout(t)
    }

    setLoading(false)
  }, [])

  if (loading) return <Splash />

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Layout protegido: AppDataProvider monta uma vez, compartilha entre todas as rotas filhas */}
      <Route element={<ProtectedLayout />}>
        <Route path="/home"               element={<Home />} />
        <Route path="/matches"            element={<Matches />} />
        <Route path="/matches/:id"        element={<MatchDetail />} />
        <Route path="/ranking"             element={<Ranking />} />
        <Route path="/groups"             element={<Groups />} />
        <Route path="/bolao"              element={<Bolao />} />
        <Route path="/bolao/:id"          element={<BolaoDetail />} />
        <Route path="/bolao/:id/palpites" element={<BolaoGrupoPalpites />} />
        <Route path="/profile"            element={<Profile />} />
        <Route path="/admin"              element={<Admin />} />
        <Route path="/wrapped"            element={<Wrapped />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppDataProvider>
        <ProtectedContent />
      </AppDataProvider>
    </ProtectedRoute>
  )
}

// Decide o que renderizar ANTES de qualquer página da rota aparecer: enquanto os
// dados carregam, mostra a splash da marca (nunca a Home) — e se a retrospectiva
// estiver ativa e ainda não vista, troca a rota pela `/wrapped` nesse mesmo
// momento, sem deixar a página de destino original chegar a pintar na tela.
// Cobre tanto quem abre o app depois quanto quem já está com o app aberto (o
// AppDataContext já reage ao evento de socket e atualiza `wrapped` sozinho).
function ProtectedContent() {
  const { wrapped, loading } = useAppData()
  const location = useLocation()

  if (loading) return <Splash />

  const shouldShowWrapped =
    wrapped.active &&
    location.pathname !== '/wrapped' &&
    !hasSeenWrapped(wrapped.activatedAt)

  if (shouldShowWrapped) {
    return <Navigate to="/wrapped" replace state={{ from: location.pathname + location.search }} />
  }

  return (
    <>
      <LeleEffects />
      <Outlet />
      <BottomNav />
    </>
  )
}
