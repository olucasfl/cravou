import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { register } from '@/services/authService'
import s from './Register.module.css'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/login')
    } catch {
      setError('Erro ao criar conta. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      <Link to="/login" className={s.back}>
        <ArrowLeft size={16} /> Voltar
      </Link>

      <div className={s.card}>
        <div className={s.title}>Criar conta</div>
        <div className={s.subtitle}>Junte-se ao Cravou! e faça seus palpites</div>

        {error && <div className={s.error}>{error}</div>}

        <form className={s.form} onSubmit={handleSubmit}>
          <div>
            <label className={s.label}>Nome</label>
            <input
              className="input"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className={s.label}>E-mail</label>
            <input
              className="input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={s.label}>Senha</label>
            <input
              className="input"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button className={`btn btn-primary ${s.submit}`} type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <div className={s.footer}>
          Já tem conta?{' '}
          <Link to="/login" className={s.link}>Entrar</Link>
        </div>
      </div>
    </div>
  )
}
