import React from 'react'

interface CountryInfo {
  code: string
  colors: [string, string]
}

const DATA: Record<string, CountryInfo> = {
  // ── Grupo A ──────────────────────────────────────────────────
  'méxico':              { code: 'MX', colors: ['#006847', '#CE1126'] },
  'áfrica do sul':       { code: 'ZA', colors: ['#007A4D', '#FFB612'] },
  'coreia do sul':       { code: 'KR', colors: ['#C8102E', '#003478'] },
  'república tcheca':    { code: 'CZ', colors: ['#D7141A', '#11457E'] },
  // ── Grupo B ──────────────────────────────────────────────────
  'canadá':              { code: 'CA', colors: ['#D80621', '#FFFFFF'] },
  'bósnia-herzegovina':  { code: 'BA', colors: ['#002395', '#FFCD00'] },
  'catar':               { code: 'QA', colors: ['#8D1B3D', '#FFFFFF'] },
  'suíça':               { code: 'CH', colors: ['#D52B1E', '#FFFFFF'] },
  // ── Grupo C ──────────────────────────────────────────────────
  'brasil':              { code: 'BR', colors: ['#FFDF00', '#009C3B'] },
  'marrocos':            { code: 'MA', colors: ['#C1272D', '#006233'] },
  'haiti':               { code: 'HT', colors: ['#00209F', '#D21034'] },
  'escócia':             { code: 'SC', colors: ['#003078', '#FFFFFF'] },
  // ── Grupo D ──────────────────────────────────────────────────
  'eua':                 { code: 'US', colors: ['#B22234', '#3C3B6E'] },
  'paraguai':            { code: 'PY', colors: ['#D52B1E', '#002D62'] },
  'austrália':           { code: 'AU', colors: ['#00843D', '#FFCD00'] },
  'turquia':             { code: 'TR', colors: ['#E30A17', '#FFFFFF'] },
  // ── Grupo E ──────────────────────────────────────────────────
  'alemanha':            { code: 'DE', colors: ['#000000', '#DD0000'] },
  'curaçao':             { code: 'CW', colors: ['#002B7F', '#F9E814'] },
  'costa do marfim':     { code: 'CI', colors: ['#F77F00', '#009A44'] },
  'equador':             { code: 'EC', colors: ['#FFD100', '#003087'] },
  // ── Grupo F ──────────────────────────────────────────────────
  'holanda':             { code: 'NL', colors: ['#FF6400', '#003DA5'] },
  'japão':               { code: 'JP', colors: ['#BC002D', '#FFFFFF'] },
  'suécia':              { code: 'SE', colors: ['#006AA7', '#FECC02'] },
  'tunísia':             { code: 'TN', colors: ['#E70013', '#FFFFFF'] },
  // ── Grupo G ──────────────────────────────────────────────────
  'bélgica':             { code: 'BE', colors: ['#1A1A1A', '#FAE042'] },
  'egito':               { code: 'EG', colors: ['#CE1126', '#C09300'] },
  'irã':                 { code: 'IR', colors: ['#239F40', '#DA0000'] },
  'nova zelândia':       { code: 'NZ', colors: ['#00247D', '#CC142B'] },
  // ── Grupo H ──────────────────────────────────────────────────
  'espanha':             { code: 'ES', colors: ['#AA151B', '#F1BF00'] },
  'cabo verde':          { code: 'CV', colors: ['#003893', '#CF2027'] },
  'arábia saudita':      { code: 'SA', colors: ['#006C35', '#FFFFFF'] },
  'uruguai':             { code: 'UY', colors: ['#75AADB', '#FFFFFF'] },
  // ── Grupo I ──────────────────────────────────────────────────
  'frança':              { code: 'FR', colors: ['#002395', '#ED2939'] },
  'senegal':             { code: 'SN', colors: ['#00853F', '#FDEF42'] },
  'iraque':              { code: 'IQ', colors: ['#CF0001', '#007A3D'] },
  'noruega':             { code: 'NO', colors: ['#EF2B2D', '#002868'] },
  // ── Grupo J ──────────────────────────────────────────────────
  'argentina':           { code: 'AR', colors: ['#74ACDF', '#FFFFFF'] },
  'argélia':             { code: 'DZ', colors: ['#006233', '#D21034'] },
  'áustria':             { code: 'AT', colors: ['#ED2939', '#FFFFFF'] },
  'jordânia':            { code: 'JO', colors: ['#007A3D', '#CE1126'] },
  // ── Grupo K ──────────────────────────────────────────────────
  'portugal':            { code: 'PT', colors: ['#006600', '#FF0000'] },
  'rd congo':            { code: 'CD', colors: ['#007FFF', '#F7D618'] },
  'uzbequistão':         { code: 'UZ', colors: ['#0099B5', '#1EB53A'] },
  'colômbia':            { code: 'CO', colors: ['#FCD116', '#003087'] },
  // ── Grupo L ──────────────────────────────────────────────────
  'inglaterra':          { code: 'EN', colors: ['#CF142B', '#FFFFFF'] },
  'croácia':             { code: 'HR', colors: ['#FF0000', '#003DA5'] },
  'gana':                { code: 'GH', colors: ['#006B3F', '#FCD116'] },
  'panamá':              { code: 'PA', colors: ['#DA121A', '#003580'] },
}

function getTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#000000' : '#FFFFFF'
}

type BadgeSize = 'xs' | 'sm' | 'md' | 'lg'

const SIZES: Record<BadgeSize, { w: number; h: number; fontSize: string; radius: string }> = {
  xs: { w: 26, h: 18, fontSize: '0.52rem', radius: '4px' },
  sm: { w: 34, h: 23, fontSize: '0.65rem', radius: '5px' },
  md: { w: 46, h: 32, fontSize: '0.85rem', radius: '6px' },
  lg: { w: 60, h: 42, fontSize: '1.1rem',  radius: '8px' },
}

interface Props {
  country: string
  size?: BadgeSize
  style?: React.CSSProperties
}

export function CountryBadge({ country, size = 'md', style }: Props) {
  const info = DATA[country.toLowerCase()]
  const { w, h, fontSize, radius } = SIZES[size]

  if (!info) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: w, height: h, borderRadius: radius,
        background: '#2d3f5c', color: '#6b7280',
        fontSize, fontWeight: 800, fontFamily: 'var(--font-display)',
        letterSpacing: '0.5px', flexShrink: 0, ...style,
      }}>
        ??
      </span>
    )
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: w, height: h, borderRadius: radius,
      overflow: 'hidden',
      border: `1px solid rgba(255,255,255,0.12)`,
      flexShrink: 0,
      ...style,
    }}>
      {info.code.split('').map((char, i) => {
        const bg = info.colors[Math.min(i, info.colors.length - 1)]
        return (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: `${100 / info.code.length}%`, height: '100%',
            background: bg, color: getTextColor(bg),
            fontSize, fontWeight: 800, fontFamily: 'var(--font-display)',
          }}>
            {char}
          </span>
        )
      })}
    </span>
  )
}

export function getCountryCode(country: string): string {
  return DATA[country.toLowerCase()]?.code ?? '??'
}
