import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Mail, RefreshCw } from 'lucide-react'
import { register, checkVerification, resendVerification } from '@/services/authService'
import s from './Register.module.css'

function getRegisterError(err: unknown): string {
  const msg: string = (err as any)?.response?.data?.message ?? ''
  if (msg.includes('already exists') || msg.includes('already registered') || msg.toLowerCase().includes('email'))
    return 'Este e-mail já está cadastrado. Tente fazer login.'
  if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('senha'))
    return 'A senha não atende aos requisitos mínimos.'
  return 'Erro ao criar conta. Verifique os dados e tente novamente.'
}

// ── Tela de aguardando verificação ────────────────────────────────────────────

function VerifyScreen({ email }: { email: string }) {
  const navigate = useNavigate()
  const [verified, setVerified]       = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent]   = useState(false)

  // Polling a cada 3s
  const poll = useCallback(async () => {
    try {
      const { verified: v } = await checkVerification(email)
      if (v) setVerified(true)
    } catch { /* ignora erros de rede no polling */ }
  }, [email])

  useEffect(() => {
    if (verified) {
      const t = setTimeout(() => navigate('/login'), 2000)
      return () => clearTimeout(t)
    }
    poll() // primeira verificação imediata
    const iv = setInterval(poll, 3000)
    return () => clearInterval(iv)
  }, [verified, poll, navigate])

  async function handleResend() {
    setResendLoading(true)
    setResendSent(false)
    try {
      await resendVerification(email)
      setResendSent(true)
    } catch { /* ignora */ }
    finally { setResendLoading(false) }
  }

  if (verified) return (
    <div className={s.verifyBox}>
      <CheckCircle2 size={56} color="var(--c-green)" strokeWidth={1.5} />
      <div className={s.verifyTitle}>E-mail verificado!</div>
      <div className={s.verifySub}>Levando você para o login…</div>
      <div className={s.verifyDots}>
        <span /><span /><span />
      </div>
    </div>
  )

  return (
    <div className={s.verifyBox}>
      <div className={s.mailIconWrap}>
        <Mail size={32} color="var(--c-accent)" />
        <span className={s.mailPulse} />
      </div>
      <div className={s.verifyTitle}>Verifique seu e-mail</div>
      <div className={s.verifySub}>
        Enviamos um link de verificação para<br />
        <strong>{email}</strong>
      </div>
      <div className={s.verifyNote}>
        Clique no link do e-mail para ativar sua conta.<br />
        Esta tela atualiza automaticamente.
      </div>

      {!resendSent ? (
        <button
          className={s.resendBtn}
          onClick={handleResend}
          disabled={resendLoading}
          type="button"
        >
          {resendLoading
            ? <><RefreshCw size={14} className={s.spin} /> Enviando...</>
            : <><Mail size={14} /> Reenviar e-mail</>
          }
        </button>
      ) : (
        <div className={s.resendOk}>
          <CheckCircle2 size={14} /> E-mail reenviado! Verifique sua caixa de entrada.
        </div>
      )}

      <Link to="/login" className={s.alreadyLink}>
        Já verifiquei — fazer login
      </Link>
    </div>
  )
}

// ── Formulário de cadastro ─────────────────────────────────────────────────────

export default function Register() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [registered, setRegistered] = useState(false)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      setError('A senha deve ter pelo menos 1 letra e 1 número.')
      return
    }
    setLoading(true)
    try {
      await register(name, email, password)
      setRegistered(true)
    } catch (err) {
      setError(getRegisterError(err))
    } finally {
      setLoading(false)
    }
  }

  if (registered) return (
    <div className={s.page}>
      <div className={s.card}>
        <VerifyScreen email={email} />
      </div>
    </div>
  )

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
            <input className="input" type="text" placeholder="Seu nome"
              value={name} onChange={(e) => setName(e.target.value)}
              required minLength={2} autoComplete="name" />
          </div>
          <div>
            <label className={s.label}>E-mail</label>
            <input className="input" type="email" placeholder="seu@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" />
          </div>
          <div>
            <label className={s.label}>Senha</label>
            <input className="input" type="password" placeholder="Mín. 8 caracteres, letra e número"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8} autoComplete="new-password" />
          </div>
          <div>
            <label className={s.label}>Confirmar senha</label>
            <input
              className={`input ${confirm && confirm !== password ? s.inputError : ''}`}
              type="password" placeholder="Repita a senha"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              required minLength={8} autoComplete="new-password" />
            {confirm && confirm !== password && (
              <div className={s.fieldError}>As senhas não coincidem</div>
            )}
          </div>
          <button
            className={`btn btn-primary ${s.submit}`}
            type="submit"
            disabled={loading || (!!confirm && confirm !== password)}
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
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
