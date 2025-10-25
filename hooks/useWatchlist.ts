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
    setIsLoading(true)
    try {
      const result = await window.storage.get(STORAGE_KEY)
      if (result?.value) {
        const parsed = JSON.parse(result.value)
        console.log('Loaded watchlist:', parsed)
        setWatchlist(parsed)
      } else {
        console.log('No watchlist found, starting fresh')
        setWatchlist([])
      }
    } catch (error) {
      console.error('Error loading watchlist:', error)
      setWatchlist([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addToWatchlist = useCallback(async (item: Omit<WatchlistItem, 'addedAt'>) => {
    // Check if already exists
    const exists = watchlist.some(w => w.tokenAddress.toLowerCase() === item.tokenAddress.toLowerCase())
    if (exists) {
      console.log('Token already in watchlist')
      throw new Error('Token already in watchlist')
    }

    const newItem: WatchlistItem = {
      ...item,
      addedAt: Date.now()
    }

    const updated = [...watchlist, newItem]
    console.log('Adding to watchlist:', newItem)
    console.log('Updated watchlist:', updated)
    
    setWatchlist(updated)
    
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(updated))
      console.log('Watchlist saved successfully')
      
      // Verify it was saved
      const verification = await window.storage.get(STORAGE_KEY)
      console.log('Verification after save:', verification)
    } catch (error) {
      console.error('Failed to save watchlist:', error)
      // Revert state on error
      setWatchlist(watchlist)
      throw error
    }
  }, [watchlist])

  const removeFromWatchlist = useCallback(async (tokenAddress: string) => {
    const updated = watchlist.filter(
      item => item.tokenAddress.toLowerCase() !== tokenAddress.toLowerCase()
    )
    console.log('Removing from watchlist:', tokenAddress)
    console.log('Updated watchlist:', updated)
    
    setWatchlist(updated)
    
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(updated))
      console.log('Watchlist updated successfully')
    } catch (error) {
      console.error('Failed to update watchlist:', error)
      // Revert state on error
      setWatchlist(watchlist)
      throw error
    }
  }, [watchlist])

  const updateWatchlistItem = useCallback(async (
    tokenAddress: string,
    updates: Partial<WatchlistItem>
  ) => {
    const updated = watchlist.map(item =>
      item.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() 
        ? { ...item, ...updates } 
        : item
    )
    console.log('Updating watchlist item:', tokenAddress, updates)
    
    setWatchlist(updated)
    
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(updated))
      console.log('Watchlist item updated successfully')
    } catch (error) {
      console.error('Failed to update watchlist:', error)
      // Revert state on error
      setWatchlist(watchlist)
      throw error
    }
  }, [watchlist])

  const isInWatchlist = useCallback((tokenAddress: string) => {
    const exists = watchlist.some(
      item => item.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
    )
    console.log(`Checking if ${tokenAddress} is in watchlist:`, exists)
    return exists
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