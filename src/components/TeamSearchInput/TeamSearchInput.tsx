import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { CountryBadge } from '@/components/CountryBadge'
import s from './TeamSearchInput.module.css'

export const COPA_TEAMS = [
  'África do Sul', 'Alemanha', 'Arábia Saudita', 'Argélia', 'Argentina', 'Áustria', 'Austrália',
  'Bélgica', 'Bósnia-Herzegovina', 'Brasil',
  'Cabo Verde', 'Canadá', 'Catar', 'Colômbia', 'Coreia do Sul', 'Costa do Marfim', 'Croácia', 'Curaçao',
  'EUA', 'Egito', 'Equador', 'Escócia', 'Espanha',
  'França',
  'Gana',
  'Haiti', 'Holanda',
  'Inglaterra', 'Irã', 'Iraque',
  'Japão', 'Jordânia',
  'Marrocos', 'México',
  'Noruega', 'Nova Zelândia',
  'Panamá', 'Paraguai', 'Portugal',
  'RD Congo', 'República Tcheca',
  'Senegal', 'Suécia', 'Suíça',
  'Tunísia', 'Turquia',
  'Uruguai', 'Uzbequistão',
]

interface Props {
  value: string
  onChange: (team: string) => void
  placeholder?: string
}

export function TeamSearchInput({ value, onChange, placeholder = 'Buscar seleção...' }: Props) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)

  useEffect(() => { setQuery(value) }, [value])

  const filtered = query.trim()
    ? COPA_TEAMS.filter(t => t.toLowerCase().includes(query.toLowerCase()))
    : COPA_TEAMS

  function select(team: string) {
    onChange(team)
    setQuery(team)
    setOpen(false)
  }

  function clear(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(true)
  }

  return (
    <div className={s.container}>
      <div className={s.inputWrap}>
        <input
          className={s.input}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {value && (
          <button className={s.clearBtn} onMouseDown={clear} tabIndex={-1} type="button">
            <X size={11} />
          </button>
        )}
      </div>

      {open && (
        <div className={s.dropdown}>
          {filtered.length === 0 && (
            <div className={s.noResults}>Nenhuma seleção encontrada</div>
          )}
          {filtered.map(team => (
            <button
              key={team}
              className={`${s.option} ${value === team ? s.optionSelected : ''}`}
              onMouseDown={e => { e.preventDefault(); select(team) }}
              type="button"
            >
              <CountryBadge country={team} size="xs" />
              <span className={s.optionName}>{team}</span>
              {value === team && <span className={s.optionCheck}><Check size={13} strokeWidth={2.5} /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
