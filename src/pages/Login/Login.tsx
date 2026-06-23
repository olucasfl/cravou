import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react'
import { login, forgotPassword, resendVerification } from '@/services/authService'
import s from './Login.module.css'

function getLoginError(err: unknown): { msg: string; notVerified: boolean } {
  const msg: string = (err as any)?.response?.data?.message ?? ''
  if (msg.includes('verify your email'))
    return { msg: 'Seu e-mail ainda não foi verificado.', notVerified: true }
  if (msg.includes('Invalid credentials') || msg.includes('Unauthorized'))
    return { msg: 'E-mail ou senha incorretos.', notVerified: false }
  return { msg: 'Erro ao entrar. Tente novamente.', notVerified: false }
}

export default function Login() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // Conta não verificada
  const [notVerified, setNotVerified]   = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent]     = useState(false)

  // Esqueci minha senha
  const [forgotOpen, setForgotOpen]   = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent]   = useState(false)
  const [forgotError, setForgotError] = useState('')

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(''); setNotVerified(false); setResendSent(false)
    setLoading(true)
    try {
      await login(email, password)
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      window.location.replace('/home')
    } catch (err) {
      setPassword('')
      const { msg, notVerified: nv } = getLoginError(err)
      setError(msg)
      setNotVerified(nv)
      setLoading(false)
    }
  }

  async function handleResend() {
    setResendLoading(true)
    try {
      await resendVerification(email)
      setResendSent(true)
    } catch {
      setError('Não foi possível reenviar o e-mail. Tente novamente.')
    } finally { setResendLoading(false) }
  }

  async function handleForgot(e: { preventDefault(): void }) {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    try {
      await forgotPassword(forgotEmail)
      setForgotSent(true)
    } catch {
      setForgotError('Não foi possível enviar o e-mail. Tente novamente.')
    } finally { setForgotLoading(false) }
  }

  return (
    <div className={s.page}>
      <div className={s.logo}>
        <img src="/logo-ball.png" className={s.logoBall} alt="" />
        <img src="/logo-text.png" className={s.logoText} alt="Cravou!" />
        <div className={s.logoSub}>Copa do Mundo 2026</div>
      </div>

      <div className={s.card}>
        {!forgotOpen ? (
          <>
            <div className={s.title}>Bem-vindo de volta</div>
            <div className={s.subtitle}>Entre para ver seus palpites</div>

            {error && (
              <div className={s.error}>
                <span>{error}</span>
                {notVerified && !resendSent && (
                  <button
                    className={s.errorAction}
                    onClick={handleResend}
                    disabled={resendLoading}
                    type="button"
                  >
                    <Mail size={13} />
                    {resendLoading ? 'Enviando...' : 'Reenviar e-mail de verificação'}
                  </button>
                )}
                {resendSent && (
                  <div className={s.successInline}>
                    <CheckCircle2 size={13} /> E-mail reenviado! Verifique sua caixa de entrada.
                  </div>
                )}
              </div>
            )}

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
                <div className={s.labelRow}>
                  <label className={s.label}>Senha</label>
                  <button
                    type="button"
                    className={s.forgotLink}
                    onClick={() => { setForgotOpen(true); setForgotEmail(email) }}
                  >
                    Esqueci minha senha
                  </button>
                </div>
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
          </>
        ) : (
          /* ── Painel Esqueci Minha Senha ── */
          <>
            <button type="button" className={s.backBtn} onClick={() => { setForgotOpen(false); setForgotSent(false); setForgotError('') }}>
              <ArrowLeft size={14} /> Voltar ao login
            </button>

            <div className={s.title}>Recuperar senha</div>
            <div className={s.subtitle}>Enviaremos um link de redefinição para o seu e-mail.</div>

            {!forgotSent ? (
              <>
                {forgotError && <div className={s.error}>{forgotError}</div>}
                <form className={s.form} onSubmit={handleForgot}>
                  <div>
                    <label className={s.label}>E-mail</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="seu@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <button className={`btn btn-primary ${s.submit}`} type="submit" disabled={forgotLoading}>
                    {forgotLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                  </button>
                </form>
              </>
            ) : (
              <div className={s.successBox}>
                <CheckCircle2 size={40} color="var(--c-green)" />
                <div className={s.successTitle}>E-mail enviado!</div>
                <div className={s.successText}>
                  Se <strong>{forgotEmail}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha em breve.
                </div>
                <button type="button" className={`btn btn-outline ${s.submit}`} onClick={() => setForgotOpen(false)}>
                  Voltar ao login
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
