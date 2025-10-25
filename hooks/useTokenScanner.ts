import { useState, useCallback } from 'react'
import { TokenAnalysis } from '@/types'
import axios from 'axios'

export const useTokenScanner = () => {
  const [analysis, setAnalysis] = useState<TokenAnalysis | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scanToken = useCallback(async (tokenAddress: string) => {
    setIsScanning(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await axios.post('/api/scan', { tokenAddress })
      setAnalysis(response.data)
      return response.data
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to scan token'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsScanning(false)
    }
  }, [])

  const reset = useCallback(() => {
    setAnalysis(null)
    setError(null)
    setIsScanning(false)
  }, [])

  return {
    analysis,
    isScanning,
    error,
    scanToken,
    reset
  }
}