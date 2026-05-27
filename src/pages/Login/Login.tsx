import { useState } from 'react'
import { Link } from 'react-router-dom'
import { login } from '@/services/authService'
import s from './Login.module.css'

function getLoginError(err: unknown): string {
  const msg: string = (err as any)?.response?.data?.message ?? ''
  if (msg.includes('verify your email')) return 'Verifique seu e-mail antes de entrar.'
  if (msg.includes('Invalid credentials') || msg.includes('Unauthorized'))
    return 'E-mail ou senha incorretos.'
  return 'Erro ao entrar. Tente novamente.'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // Força reload completo para limpar qualquer estado React cacheado de sessão anterior
      window.location.replace('/home')
    } catch (err) {
      setPassword('')
      setError(getLoginError(err))
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.logo}>
        <img src="/logo-ball.png" className={s.logoBall} alt="" />
        <img src="/logo-text.png" className={s.logoText} alt="Cravou!" />
        <div className={s.logoSub}>Copa do Mundo 2026</div>
      </div>

      <div className={s.card}>
        <div className={s.title}>Bem-vindo de volta</div>
        <div className={s.subtitle}>Entre para ver seus palpites</div>

        {error && <div className={s.error}>{error}</div>}

        <form className={s.form} onSubmit={handleSubmit}>
          <div>
            <label className={s.label}>E-mail</label>
            <input
              className="input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className={s.label}>Senha</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button className={`btn btn-primary ${s.submit}`} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className={s.footer}>
          Não tem conta?{' '}
          <Link to="/register" className={s.link}>Criar conta</Link>
        </div>
      </div>
    </div>
  )
}
