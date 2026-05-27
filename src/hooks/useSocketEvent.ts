import { useEffect } from 'react'
import { getSocket } from '@/services/socketService'

export function useSocketEvent(event: string, handler: () => void) {
  useEffect(() => {
    const socket = getSocket()
    socket.on(event, handler)
    return () => { socket.off(event, handler) }
  }, [event, handler])
}
