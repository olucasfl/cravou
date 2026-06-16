import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getMe, type User } from '@/services/authService'
import {
  getMatches, getMyPredictions, getRanking, getAllGroups, getBracket,
  type Match, type Prediction, type GroupData, type RankingEntry, type BracketSlot,
} from '@/services/cravouService'
import { clearCache } from '@/utils/cache'
import { useSocketEvent } from '@/hooks/useSocketEvent'

interface AppData {
  user: User | null
  matches: Match[]
  predictions: Prediction[]
  ranking: RankingEntry[]
  groups: GroupData[]
  bracket: BracketSlot[]
  loading: boolean
  refreshing: boolean
  refresh: () => Promise<void>
}

const AppDataContext = createContext<AppData>({
  user: null,
  matches: [],
  predictions: [],
  ranking: [],
  groups: [],
  bracket: [],
  loading: true,
  refreshing: false,
  refresh: async () => {},
})

export function useAppData() {
  return useContext(AppDataContext)
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]             = useState<User | null>(null)
  const [matches, setMatches]       = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [ranking, setRanking]       = useState<RankingEntry[]>([])
  const [groups, setGroups]         = useState<GroupData[]>([])
  const [bracket, setBracket]       = useState<BracketSlot[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const mountedRef                  = useRef(true)
  const lastFetchAt                 = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const applyData = useCallback((
    u: User | null,
    all: Match[],
    preds: Prediction[],
    rank: RankingEntry[],
    g: GroupData[],
    b: BracketSlot[],
  ) => {
    if (!mountedRef.current) return
    lastFetchAt.current = Date.now()
    setUser(u)
    setMatches(all)
    setPredictions(preds)
    setRanking(rank)
    setGroups(g)
    setBracket(b)
    setLoading(false)
    setRefreshing(false)
  }, [])

  const fetchAll = useCallback(async () => {
    const [u, all, preds, rank, g, b] = await Promise.all([
      getMe().catch(() => null),
      getMatches().catch(() => [] as Match[]),
      getMyPredictions().catch(() => [] as Prediction[]),
      getRanking().catch(() => [] as RankingEntry[]),
      getAllGroups().catch(() => [] as GroupData[]),
      getBracket().catch(() => [] as BracketSlot[]),
    ])
    applyData(u, all, preds, rank, g, b)
  }, [applyData])

  // Carregamento inicial
  useEffect(() => { fetchAll() }, [fetchAll])

  // Refetch automático quando o app volta ao foco (troca de aba, desbloquear celular, etc.)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchAt.current > 30_000) {
        clearCache()
        fetchAll()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchAll])

  // Refresh completo: limpa cache e rebusca tudo
  const refresh = useCallback(async () => {
    setRefreshing(true)
    clearCache()
    await fetchAll()
  }, [fetchAll])

  // Socket events centralizados
  useSocketEvent('match:updated', useCallback(() => {
    clearCache('matches', 'ranking', 'predictions', 'me')
    fetchAll()
  }, [fetchAll]))

  useSocketEvent('match:locked', useCallback(() => {
    clearCache('matches')
    fetchAll()
  }, [fetchAll]))

  useSocketEvent('ranking:updated', useCallback(() => {
    clearCache('ranking', 'me')
    fetchAll()
  }, [fetchAll]))

  useSocketEvent('group:classified', useCallback(() => {
    clearCache('groups', 'bracket')
    fetchAll()
  }, [fetchAll]))

  useSocketEvent('tournament:all-groups-complete', useCallback(() => {
    clearCache('groups', 'bracket')
    fetchAll()
  }, [fetchAll]))

  return (
    <AppDataContext.Provider value={{ user, matches, predictions, ranking, groups, bracket, loading, refreshing, refresh }}>
      {children}
    </AppDataContext.Provider>
  )
}
