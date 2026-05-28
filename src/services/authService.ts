import api from './api'
import { getCache, setCache, clearCache } from '@/utils/cache'

export interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  bolaoPoints: number
  cravadas: number
}

export async function login(email: string, password: string) {
  // Endpoint: POST /auth/login → retorna { access_token, refresh_token }
  const { data } = await api.post('/auth/login', { email, password })
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return data
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post('/users', { name, email, password, confirmPassword: password })
  return data
}

export async function checkVerification(email: string): Promise<{ verified: boolean }> {
  const { data } = await api.get('/auth/check-verification', { params: { email } })
  return data
}

export async function getMe(): Promise<User> {
  const cached = getCache<User>('me', 300_000) // 5 min
  if (cached) return cached
  const { data } = await api.get('/users/me')
  setCache('me', data)
  return data
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email })
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post('/auth/reset-password', { token, password })
}

export async function resendVerification(email: string): Promise<void> {
  await api.post('/auth/resend-verification', { email })
}

export async function logout() {
  clearCache() // limpa todo o cache na saída
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  // Limpa cache do Service Worker para não servir dados da sessão anterior
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }
  window.location.replace('/login')
}

export function isAuthenticated() {
  return !!localStorage.getItem('access_token')
}
