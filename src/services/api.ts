import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'x-app': 'cravou' },
})

let isRefreshing = false
let queue: Array<(token: string) => void> = []

function processQueue(token: string) {
  queue.forEach((cb) => cb(token))
  queue = []
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Impede que o browser sirva respostas cacheadas de outra sessão
  config.headers['Cache-Control'] = 'no-cache'
  config.headers['Pragma'] = 'no-cache'
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // Não tentar refresh quando a própria requisição de auth falhou
    const url: string = original.url ?? ''
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/users')) {
      return Promise.reject(error)
    }

    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }

    isRefreshing = true
    const refreshToken = localStorage.getItem('refresh_token')

    if (!refreshToken) {
      logout()
      return Promise.reject(error)
    }

    try {
      // Backend espera campo "refresh_token" no body
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      })
      // Backend retorna access_token / refresh_token (snake_case)
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      processQueue(data.access_token)
      original.headers.Authorization = `Bearer ${data.access_token}`
      return api(original)
    } catch {
      logout()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

async function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }
  window.location.replace('/login')
}

export default api
