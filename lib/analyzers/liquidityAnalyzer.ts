import axios from 'axios'
import { LiquidityHealthAnalysis, LiquidityPair } from '@/types'

const BLOCKSCOUT_API_URL = 'https://celo-sepolia.blockscout.com/api'

export class LiquidityAnalyzer {
  
  async analyzeLiquidity(tokenAddress: string): Promise<LiquidityHealthAnalysis> {
    try {
      console.log('Analyzing liquidity for:', tokenAddress)
      
      const [pairs, holders] = await Promise.all([
        this.findLiquidityPairs(tokenAddress),
        this.getHolders(tokenAddress)
      ])

      const totalLiquidity = this.calculateTotalLiquidity(pairs)
      const lockedPercentage = this.calculateLockedPercentage(pairs, holders)
      const recentChanges = await this.detectLiquidityChanges(tokenAddress)
      const volatilityRisk = this.calculateVolatilityRisk(pairs, totalLiquidity)

      const score = this.calculateLiquidityScore(
        totalLiquidity,
        lockedPercentage,
        recentChanges,
        volatilityRisk,
        pairs.length
      )

      return {
        score,
        totalLiquidity: totalLiquidity.toString(),
        liquidityPairs: pairs,
        lockedPercentage,
        recentChanges,
        volatilityRisk
      }
    } catch (error) {
      console.error('Liquidity analysis error:', error)
      throw error
    }
  }

  private async findLiquidityPairs(tokenAddress: string): Promise<LiquidityPair[]> {
    try {
      // Get token holders - LP contracts typically hold tokens
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/tokens/${tokenAddress}/holders`, {
        params: { page: 1, limit: 50 },
        timeout: 10000
      })

      if (!response.data?.items) return []

      const pairs: LiquidityPair[] = []

      // Check each holder to see if it's a potential LP contract
      for (const holder of response.data.items.slice(0, 10)) {
        const address = holder.address?.hash || holder.address
        const isContract = holder.address?.is_contract || false

        if (isContract) {
          const balance = holder.value || '0'
          
          // Check if this looks like a DEX pair
          const isPair = await this.checkIfDEXPair(address)
          
          if (isPair || parseFloat(balance) > 0) {
            pairs.push({
              pair: address,
              liquidity: balance,
              locked: false, // Would need to check locker contracts
              lockDuration: undefined
            })
          }
        }
      }

      return pairs
    } catch (error) {
      console.error('Error finding liquidity pairs:', error)
      return []
    }
  }

  private async checkIfDEXPair(address: string): Promise<boolean> {
    try {
      // Check if address has pair-like characteristics
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/addresses/${address}`, {
        timeout: 10000
      })

      if (response.data) {
        const name = response.data.name?.toLowerCase() || ''
        const isPair = name.includes('pair') || name.includes('lp') || name.includes('pool')
        return isPair
      }

      return false
    } catch (error) {
      return false
    }
  }

  private async getHolders(tokenAddress: string): Promise<any[]> {
    try {
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/tokens/${tokenAddress}/holders`, {
        params: { page: 1, limit: 20 },
        timeout: 10000
      })

      return response.data?.items || []
    } catch (error) {
      return []
    }
  }

  private calculateTotalLiquidity(pairs: LiquidityPair[]): number {
    return pairs.reduce((sum, pair) => {
      const liquidity = parseFloat(pair.liquidity)
      return sum + (isNaN(liquidity) ? 0 : liquidity)
    }, 0)
  }

  private calculateLockedPercentage(pairs: LiquidityPair[], holders: any[]): number {
    if (pairs.length === 0) return 0

    // Check if liquidity is held by known locker contracts
    const knownLockers = [
      '0x0000000000000000000000000000000000000001',
      // Add known Celo locker addresses
    ]

    let lockedLiquidity = 0
    const totalLiquidity = this.calculateTotalLiquidity(pairs)

    pairs.forEach(pair => {
      if (knownLockers.includes(pair.pair.toLowerCase())) {
        lockedLiquidity += parseFloat(pair.liquidity)
      }
    })

    return totalLiquidity > 0 ? (lockedLiquidity / totalLiquidity) * 100 : 0
  }

  private async detectLiquidityChanges(tokenAddress: string): Promise<number> {
    try {
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/tokens/${tokenAddress}/transfers`, {
        params: { type: 'ERC-20' },
        timeout: 10000
      })

      if (!response.data?.items) return 0

      const now = Date.now()
      const oneDayAgo = now - 86400000

      const recentTxs = response.data.items.filter((tx: any) => {
        if (!tx.timestamp) return false
        const txTime = new Date(tx.timestamp).getTime()
        return txTime > oneDayAgo
      })

      // Look for large liquidity movements
      const largeTxs = recentTxs.filter((tx: any) => {
        const value = parseFloat(tx.total?.value || tx.value || '0')
        return value > 1000000000000000000 // > 1 token (assuming 18 decimals)
      })

      return Math.min(largeTxs.length * 5, 50)
    } catch (error) {
      return 0
    }
  }

  private calculateVolatilityRisk(pairs: LiquidityPair[], totalLiquidity: number): number {
    let volatilityScore = 0

    // Very low liquidity
    if (totalLiquidity < 1000000000000000000) { // < 1 token
      volatilityScore += 40
    } else if (totalLiquidity < 10000000000000000000) { // < 10 tokens
      volatilityScore += 30
    } else if (totalLiquidity < 100000000000000000000) { // < 100 tokens
      volatilityScore += 20
    }

    // Few pairs
    if (pairs.length === 0) {
      volatilityScore += 30
    } else if (pairs.length === 1) {
      volatilityScore += 20
    }

    // No locked liquidity
    const hasLocked = pairs.some(p => p.locked)
    if (!hasLocked) {
      volatilityScore += 20
    }

    return Math.min(volatilityScore, 100)
  }

  private calculateLiquidityScore(
    totalLiquidity: number,
    lockedPercentage: number,
    recentChanges: number,
    volatilityRisk: number,
    pairCount: number
  ): number {
    let score = 0

    // Low liquidity penalty
    if (totalLiquidity < 1000000000000000000) {
      score += 40
    } else if (totalLiquidity < 10000000000000000000) {
      score += 30
    } else if (totalLiquidity < 100000000000000000000) {
      score += 20
    }

    // Unlocked liquidity penalty
    if (lockedPercentage < 20) {
      score += 25
    } else if (lockedPercentage < 50) {
      score += 15
    }

    // Recent changes penalty
    score += Math.min(recentChanges, 20)

    // Single pair risk
    if (pairCount === 0) {
      score += 30
    } else if (pairCount === 1) {
      score += 15
    }

    // Volatility contribution
    score += Math.round(volatilityRisk * 0.15)

    return Math.min(score, 100)
  }
}