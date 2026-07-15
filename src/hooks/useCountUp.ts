import { useEffect, useState } from 'react'

export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf: number
    const start = performance.now()

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs)
      setValue(Math.round(progress * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}
