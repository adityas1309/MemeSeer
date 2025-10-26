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
      console.log('🔍 Fetching tokens for wallet:', address)
      
      // Try v2 API endpoint
      let response
      try {
        response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/addresses/${address}/tokens`, {
          params: {
            type: 'ERC-20'
          },
          timeout: 20000
        })
        console.log('✅ API Response:', response.data)
      } catch (apiError: any) {
        console.error('❌ API Error:', apiError.message)
        
        // Try alternative endpoint
        try {
          console.log('🔄 Trying alternative endpoint...')
          response = await axios.get(`${BLOCKSCOUT_API_URL}`, {
            params: {
              module: 'account',
              action: 'tokenlist',
              address: address
            },
            timeout: 20000
          })
          console.log('✅ Alternative API Response:', response.data)
        } catch (altError) {
          throw new Error('Failed to fetch tokens from both API endpoints')
        }
      }

      if (response?.data?.items && Array.isArray(response.data.items)) {
        console.log(`📊 Found ${response.data.items.length} items in response`)
        
        const tokenList: WalletToken[] = response.data.items
          .map((item: any) => {
            console.log('🔍 RAW token item:', JSON.stringify(item, null, 2))

            const tokenAddress = item.token?.address_hash || item.token?.address || item.contractAddress
            const balance = item.value || item.balance || '0'
            const name = item.token?.name || item.name || 'Unknown Token'
            const symbol = item.token?.symbol || item.symbol || 'UNKNOWN'
            const decimals = parseInt(item.token?.decimals || item.decimals || '18')
            const isContract = item.token?.is_contract || false

            // Parse balance as a number to check if it's > 0
            const balanceNum = parseFloat(balance)
            
            console.log(`📊 Parsed Token ${symbol}:`, {
              address: tokenAddress,
              balance,
              balanceNum,
              decimals,
              isContract,
              balanceIsString: typeof balance === 'string',
              balanceLength: balance?.length
            })

            // Include all tokens, even with zero balance for debugging
            return {
              address: tokenAddress,
              name,
              symbol,
              balance,
              decimals,
              type: item.token?.type || item.type || 'ERC-20'
            }
          })
          .filter((token: any) => {
            // Filter out invalid tokens
            const hasAddress = token.address && token.address !== '0x0000000000000000000000000000000000000000'
            const balanceValue = parseFloat(token.balance || '0')
            const hasBalance = balanceValue > 0
            
            console.log(`🔎 Filtering ${token.symbol}:`, {
              address: token.address,
              hasAddress,
              balance: token.balance,
              balanceValue,
              hasBalance,
              willInclude: hasAddress && hasBalance,
              addressType: typeof token.address,
              balanceType: typeof token.balance
            })
            
            return hasAddress && hasBalance
          })

        console.log(`✅ Processed ${tokenList.length} valid tokens`)
        setTokens(tokenList)

        if (tokenList.length === 0) {
          setError('No tokens found in wallet. The tokens might be on a different network or the API might not have indexed them yet.')
        }
      } else if (response?.data?.result && Array.isArray(response.data.result)) {
        // Handle alternative API format
        console.log(`📊 Found ${response.data.result.length} items in alternative format`)
        
        const tokenList: WalletToken[] = response.data.result
          .filter((item: any) => parseFloat(item.balance || '0') > 0)
          .map((item: any) => ({
            address: item.contractAddress,
            name: item.name || 'Unknown Token',
            symbol: item.symbol || 'UNKNOWN',
            balance: item.balance || '0',
            decimals: parseInt(item.decimals || '18'),
            type: item.type || 'ERC-20'
          }))

        console.log(`✅ Processed ${tokenList.length} valid tokens`)
        setTokens(tokenList)

        if (tokenList.length === 0) {
          setError('No tokens found in wallet. The tokens might be on a different network.')
        }
      } else {
        console.warn('⚠️ Unexpected API response format:', response?.data)
        setTokens([])
        setError('Unexpected response format from blockchain explorer. Please try again.')
      }
    } catch (err: any) {
      console.error('💥 Error fetching wallet tokens:', err)
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch wallet tokens. Please check your connection and try again.'
      setError(errorMessage)
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
      if (value >= 1) return value.toFixed(4)
      return value.toFixed(6)
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