import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { resetPassword } from '@/services/authService'
import s from './ResetPassword.module.css'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  if (!token) return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.box}>
          <AlertTriangle size={44} color="var(--c-red)" strokeWidth={1.5} />
          <div className={s.boxTitle}>Link inválido</div>
          <div className={s.boxText}>Este link de recuperação é inválido ou já foi utilizado. Solicite um novo.</div>
          <Link to="/login" className={`btn btn-primary ${s.btn}`}>Voltar ao login</Link>
        </div>
      </div>
    </div>
  )

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    setLoading(true)
    try {
      await resetPassword(token, password)
      setSuccess(true)
    } catch {
      setError('Link inválido ou expirado. Solicite uma nova recuperação de senha.')
    } finally { setLoading(false) }
  }

  if (success) return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.box}>
          <CheckCircle2 size={48} color="var(--c-green)" strokeWidth={1.5} />
          <div className={s.boxTitle}>Senha redefinida!</div>
          <div className={s.boxText}>Sua senha foi alterada com sucesso. Faça login com a nova senha.</div>
          <Link to="/login" className={`btn btn-primary ${s.btn}`}>Fazer login</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className={s.page}>
      <div className={s.logo}>
        <img src="/logo-ball.png" className={s.logoBall} alt="" />
        <img src="/logo-text.png" className={s.logoText} alt="Cravou!" />
      </div>

      <div className={s.card}>
        <div className={s.title}>Nova senha</div>
        <div className={s.subtitle}>Escolha uma nova senha para a sua conta.</div>

        {error && <div className={s.error}>{error}</div>}

        <form className={s.form} onSubmit={handleSubmit}>
          <div>
            <label className={s.label}>Nova senha</label>
            <input
              className="input"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={s.label}>Confirmar nova senha</label>
            <input
              className={`input ${confirm && confirm !== password ? s.inputError : ''}`}
              type="password"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            {confirm && confirm !== password && (
              <div className={s.fieldError}>As senhas não coincidem</div>
            )}
          </div>
          <button
            className={`btn btn-primary ${s.submit}`}
            type="submit"
            disabled={loading || (!!confirm && confirm !== password)}
          >
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>

        <div className={s.footer}>
          <Link to="/login" className={s.link}>Voltar ao login</Link>
        </div>
      </div>
    </div>
  )
}
