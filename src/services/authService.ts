import api from './api'

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
  // Endpoint: POST /users → requer confirmPassword; header x-app: cravou auto-verifica
  const { data } = await api.post('/users', { name, email, password, confirmPassword: password })
  return data
}

export async function getMe(): Promise<User> {
  // Endpoint: GET /users/me
  const { data } = await api.get('/users/me')
  return data
}

export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.location.href = '/login'
}

export function isAuthenticated() {
  return !!localStorage.getItem('access_token')
}
