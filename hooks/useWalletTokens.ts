import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import axios from 'axios'

const BLOCKSCOUT_API_URL = 'https://celo-sepolia.blockscout.com/api'

export interface WalletToken {
  address: string
  name: string
  symbol: string
  balance: string
  decimals: number
  type: string
  lastScanned?: number
  riskScore?: number
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export const useWalletTokens = () => {
  const { address, isConnected } = useAccount()
  const [tokens, setTokens] = useState<WalletToken[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWalletTokens = useCallback(async () => {
    if (!address || !isConnected) {
      setTokens([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Fetching tokens for wallet:', address)
      
      // Fetch token balances from Blockscout
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/addresses/${address}/tokens`, {
        params: {
          type: 'ERC-20'
        },
        timeout: 15000
      })

      if (response.data?.items) {
        const tokenList: WalletToken[] = response.data.items
          .filter((item: any) => {
            // Filter out zero balances and native tokens
            const balance = parseFloat(item.value || '0')
            return balance > 0 && item.token?.address
          })
          .map((item: any) => ({
            address: item.token.address,
            name: item.token.name || 'Unknown Token',
            symbol: item.token.symbol || 'UNKNOWN',
            balance: item.value || '0',
            decimals: parseInt(item.token.decimals || '18'),
            type: item.token.type || 'ERC-20'
          }))

        console.log(`Found ${tokenList.length} tokens in wallet`)
        setTokens(tokenList)
      } else {
        setTokens([])
      }
    } catch (err: any) {
      console.error('Error fetching wallet tokens:', err)
      setError(err.response?.data?.error || err.message || 'Failed to fetch wallet tokens')
      setTokens([])
    } finally {
      setIsLoading(false)
    }
  }, [address, isConnected])

  // Auto-fetch when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      fetchWalletTokens()
    } else {
      setTokens([])
    }
  }, [isConnected, address, fetchWalletTokens])

  const updateTokenRisk = useCallback((tokenAddress: string, score: number, level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    setTokens(prev => prev.map(token => 
      token.address.toLowerCase() === tokenAddress.toLowerCase()
        ? { ...token, riskScore: score, riskLevel: level, lastScanned: Date.now() }
        : token
    ))
  }, [])

  const formatBalance = useCallback((balance: string, decimals: number): string => {
    try {
      const value = parseFloat(balance) / Math.pow(10, decimals)
      if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`
      if (value >= 1000) return `${(value / 1000).toFixed(2)}K`
      return value.toFixed(4)
    } catch {
      return '0'
    }
  }, [])

  return {
    tokens,
    isLoading,
    error,
    isConnected,
    walletAddress: address,
    refetch: fetchWalletTokens,
    updateTokenRisk,
    formatBalance
  }
}