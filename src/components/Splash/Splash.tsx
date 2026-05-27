import s from './Splash.module.css'

export default function Splash() {
  return (
    <div className={s.splash}>
      <img src="/logo-ball.png" className={s.ballLogo} alt="" />
      <img src="/logo-text.png" className={s.textLogo} alt="Cravou!" />
      <div className={s.dots}>
        <div className={s.dot} />
        <div className={s.dot} />
        <div className={s.dot} />
      </div>
    </div>
  )
}
