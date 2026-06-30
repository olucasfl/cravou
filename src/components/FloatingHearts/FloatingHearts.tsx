import s from './FloatingHearts.module.css'

export default function FloatingHearts() {
  return (
    <div className={s.container} aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`${s.heart} ${s[`h${i}`]}`}>❤</span>
      ))}
    </div>
  )
}
