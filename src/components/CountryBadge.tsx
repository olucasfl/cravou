import React from 'react'

interface CountryInfo {
  code: string
  colors: [string, string]
}

const DATA: Record<string, CountryInfo> = {
  // Group A
  mexico:              { code: 'MX', colors: ['#006847', '#CE1126'] },
  'south africa':      { code: 'ZA', colors: ['#007A4D', '#FFB612'] },
  'south korea':       { code: 'KR', colors: ['#C8102E', '#003478'] },
  'czech republic':    { code: 'CZ', colors: ['#D7141A', '#11457E'] },
  // Group B
  canada:              { code: 'CA', colors: ['#D80621', '#FFFFFF'] },
  'bosnia-herzegovina':{ code: 'BA', colors: ['#002395', '#FFCD00'] },
  qatar:               { code: 'QA', colors: ['#8D1B3D', '#FFFFFF'] },
  switzerland:         { code: 'CH', colors: ['#D52B1E', '#FFFFFF'] },
  // Group C
  brazil:              { code: 'BR', colors: ['#FFDF00', '#009C3B'] },
  morocco:             { code: 'MA', colors: ['#C1272D', '#006233'] },
  haiti:               { code: 'HT', colors: ['#00209F', '#D21034'] },
  scotland:            { code: 'SC', colors: ['#003078', '#FFFFFF'] },
  // Group D
  usa:                 { code: 'US', colors: ['#B22234', '#3C3B6E'] },
  paraguay:            { code: 'PY', colors: ['#D52B1E', '#002D62'] },
  australia:           { code: 'AU', colors: ['#00843D', '#FFCD00'] },
  turkey:              { code: 'TR', colors: ['#E30A17', '#FFFFFF'] },
  // Group E
  germany:             { code: 'DE', colors: ['#000000', '#DD0000'] },
  curacao:             { code: 'CW', colors: ['#002B7F', '#F9E814'] },
  'ivory coast':       { code: 'CI', colors: ['#F77F00', '#009A44'] },
  ecuador:             { code: 'EC', colors: ['#FFD100', '#003087'] },
  // Group F
  netherlands:         { code: 'NL', colors: ['#FF6400', '#003DA5'] },
  japan:               { code: 'JP', colors: ['#BC002D', '#FFFFFF'] },
  sweden:              { code: 'SE', colors: ['#006AA7', '#FECC02'] },
  tunisia:             { code: 'TN', colors: ['#E70013', '#FFFFFF'] },
  // Group G
  belgium:             { code: 'BE', colors: ['#1A1A1A', '#FAE042'] },
  egypt:               { code: 'EG', colors: ['#CE1126', '#C09300'] },
  iran:                { code: 'IR', colors: ['#239F40', '#DA0000'] },
  'new zealand':       { code: 'NZ', colors: ['#00247D', '#CC142B'] },
  // Group H
  spain:               { code: 'ES', colors: ['#AA151B', '#F1BF00'] },
  'cape verde':        { code: 'CV', colors: ['#003893', '#CF2027'] },
  'saudi arabia':      { code: 'SA', colors: ['#006C35', '#FFFFFF'] },
  uruguay:             { code: 'UY', colors: ['#75AADB', '#FFFFFF'] },
  // Group I
  france:              { code: 'FR', colors: ['#002395', '#ED2939'] },
  senegal:             { code: 'SN', colors: ['#00853F', '#FDEF42'] },
  iraq:                { code: 'IQ', colors: ['#CF0001', '#007A3D'] },
  norway:              { code: 'NO', colors: ['#EF2B2D', '#002868'] },
  // Group J
  argentina:           { code: 'AR', colors: ['#74ACDF', '#FFFFFF'] },
  algeria:             { code: 'DZ', colors: ['#006233', '#D21034'] },
  austria:             { code: 'AT', colors: ['#ED2939', '#FFFFFF'] },
  jordan:              { code: 'JO', colors: ['#007A3D', '#CE1126'] },
  // Group K
  portugal:            { code: 'PT', colors: ['#006600', '#FF0000'] },
  'dr congo':          { code: 'CD', colors: ['#007FFF', '#F7D618'] },
  uzbekistan:          { code: 'UZ', colors: ['#0099B5', '#1EB53A'] },
  colombia:            { code: 'CO', colors: ['#FCD116', '#003087'] },
  // Group L
  england:             { code: 'EN', colors: ['#CF142B', '#FFFFFF'] },
  croatia:             { code: 'HR', colors: ['#FF0000', '#003DA5'] },
  ghana:               { code: 'GH', colors: ['#006B3F', '#FCD116'] },
  panama:              { code: 'PA', colors: ['#DA121A', '#003580'] },
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

  const [c1, c2] = info.colors
  const [l1, l2] = [info.code[0], info.code[1]]

  return (
    <span style={{
      display: 'inline-flex', width: w, height: h,
      borderRadius: radius, overflow: 'hidden',
      flexShrink: 0, ...style,
    }}>
      <span style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: c1, color: getTextColor(c1),
        fontSize, fontWeight: 800, fontFamily: 'var(--font-display)',
        letterSpacing: '0px',
      }}>{l1}</span>
      <span style={{
        width: 1, background: 'rgba(0,0,0,0.25)', flexShrink: 0,
      }} />
      <span style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: c2, color: getTextColor(c2),
        fontSize, fontWeight: 800, fontFamily: 'var(--font-display)',
        letterSpacing: '0px',
      }}>{l2}</span>
    </span>
  )
}

export function getCountryCode(country: string): string {
  return DATA[country.toLowerCase()]?.code ?? '??'
}
