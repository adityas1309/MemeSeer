import { useState, useEffect, useCallback } from 'react'
import { WatchlistItem } from '@/types'

const STORAGE_KEY = 'memeseer_watchlist'

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadWatchlist()
  }, [])

  const loadWatchlist = useCallback(async () => {
    try {
      const result = await window.storage.get(STORAGE_KEY)
      if (result?.value) {
        setWatchlist(JSON.parse(result.value))
      }
    } catch (error) {
      console.log('No watchlist found, starting fresh')
      setWatchlist([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addToWatchlist = useCallback(async (item: Omit<WatchlistItem, 'addedAt'>) => {
    const newItem: WatchlistItem = {
      ...item,
      addedAt: Date.now()
    }

    const updated = [...watchlist, newItem]
    setWatchlist(updated)
    
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save watchlist:', error)
    }
  }, [watchlist])

  const removeFromWatchlist = useCallback(async (tokenAddress: string) => {
    const updated = watchlist.filter(item => item.tokenAddress !== tokenAddress)
    setWatchlist(updated)
    
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to update watchlist:', error)
    }
  }, [watchlist])

  const updateWatchlistItem = useCallback(async (
    tokenAddress: string,
    updates: Partial<WatchlistItem>
  ) => {
    const updated = watchlist.map(item =>
      item.tokenAddress === tokenAddress ? { ...item, ...updates } : item
    )
    setWatchlist(updated)
    
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to update watchlist:', error)
    }
  }, [watchlist])

  const isInWatchlist = useCallback((tokenAddress: string) => {
    return watchlist.some(item => item.tokenAddress === tokenAddress)
  }, [watchlist])

  return {
    watchlist,
    isLoading,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistItem,
    isInWatchlist
  }
}