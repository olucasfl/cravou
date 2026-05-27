export function SoccerBall({
  size = 24,
  color = 'currentColor',
  className,
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="12,7.5 16.3,10.6 14.6,15.6 9.4,15.6 7.7,10.6" />
      <line x1="12"   y1="7.5"  x2="12"   y2="2"    />
      <line x1="16.3" y1="10.6" x2="21.5" y2="8.9"  />
      <line x1="14.6" y1="15.6" x2="17.9" y2="20.1" />
      <line x1="9.4"  y1="15.6" x2="6.1"  y2="20.1" />
      <line x1="7.7"  y1="10.6" x2="2.5"  y2="8.9"  />
    </svg>
  )
}
