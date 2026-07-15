import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import type { User } from '@/services/authService'
import type { RankingEntry } from '@/services/cravouService'
import s from './scenes.module.css'
import ss from './OutroScene.module.css'

interface Props {
  user: User | null
  myEntry: RankingEntry | null
  onClose: () => void
}

export default function OutroScene({ user, myEntry, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const text = myEntry
    ? `Terminei o Cravou 2026 em #${myEntry.position}º lugar com ${myEntry.points} pontos e ${myEntry.cravadas} cravadas! ⚽🏆`
    : `Acabei de ver minha retrospectiva do Cravou 2026! ⚽🏆`

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Cravou Wrapped 2026', text })
      } catch {
        // usuário cancelou o share sheet — nada a fazer
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard indisponível — falha silenciosa, sem lib de toast dedicada aqui
    }
  }

  return (
    <div className={s.card}>
      <div className={s.eyebrow}>Até a próxima Copa{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</div>
      <div className={s.headline}>Obrigado por jogar o Cravou 🏆⚽</div>

      {myEntry && (
        <div className={ss.summary}>
          <div className={ss.summaryItem}><b>{myEntry.position}º</b><span>posição</span></div>
          <div className={ss.summaryItem}><b>{myEntry.points}</b><span>pontos</span></div>
          <div className={ss.summaryItem}><b>{myEntry.cravadas}</b><span>cravadas</span></div>
        </div>
      )}

      <div className={ss.actions}>
        <button className={ss.shareBtn} onClick={handleShare}>
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          {copied ? 'Copiado!' : 'Compartilhar'}
        </button>
        <button className={ss.closeBtn} onClick={onClose}>Fechar</button>
      </div>
    </div>
  )
}
