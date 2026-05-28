import { io, Socket } from 'socket.io-client'

const BASE_URL = import.meta.env.VITE_API_URL as string

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${BASE_URL}/cravou`, {
      transports: ['websocket'],
      autoConnect: true,
    })
  }
  return socket
}

export function joinUserRoom(userId: string) {
  getSocket().emit('join-user-room', userId)
}
