import { useState, useEffect, useCallback } from 'react'
import { getPendingInvites } from '@/services/bolaoService'
import { joinUserRoom } from '@/services/socketService'
import { useSocketEvent } from './useSocketEvent'

function getUserIdFromToken(): string | null {
  const token = localStorage.getItem('access_token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub as string
  } catch {
    return null
  }
}

export function usePendingInviteCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const userId = getUserIdFromToken()
    if (userId) joinUserRoom(userId)

    async function init() {
      try {
        const invites = await getPendingInvites()
        setCount(invites.length)
      } catch {
        // silently fail — badge simply won't show
      }
    }
    init()
  }, [])

  const onInvite = useCallback(() => setCount((c) => c + 1), [])
  useSocketEvent('group:invite-received', onInvite)

  const refresh = useCallback(async () => {
    try {
      const invites = await getPendingInvites()
      setCount(invites.length)
    } catch {}
  }, [])

  return { count, refresh }
}
