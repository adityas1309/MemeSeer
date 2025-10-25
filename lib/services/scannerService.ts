import { TokenAnalysis } from '@/types'
import { ContractAnalyzer } from '../analyzers/contractAnalyzer'
import { SocialAnalyzer } from '../analyzers/socialAnalyzer'
import { WhaleAnalyzer } from '../analyzers/whaleAnalyzer'
import { LiquidityAnalyzer } from '../analyzers/liquidityAnalyzer'
import axios from 'axios'

const BLOCKSCOUT_API_URL = 'https://celo-sepolia.blockscout.com/api'

export class ScannerService {
  private contractAnalyzer: ContractAnalyzer
  private socialAnalyzer: SocialAnalyzer
  private whaleAnalyzer: WhaleAnalyzer
  private liquidityAnalyzer: LiquidityAnalyzer

  constructor() {
    this.contractAnalyzer = new ContractAnalyzer()
    this.socialAnalyzer = new SocialAnalyzer()
    this.whaleAnalyzer = new WhaleAnalyzer()
    this.liquidityAnalyzer = new LiquidityAnalyzer()
  }

  async scanToken(tokenAddress: string): Promise<TokenAnalysis> {
    try {
      console.log('Starting scan for token:', tokenAddress)
      
      // Validate address
      if (!this.isValidAddress(tokenAddress)) {
        throw new Error('Invalid token address format. Must be a valid Ethereum address (0x...)')
      }

      // Get basic token info first
      const tokenInfo = await this.getTokenInfo(tokenAddress)
      console.log('Token info retrieved:', tokenInfo)

      // Run all analyses in parallel with error handling
      const [contractRisk, socialSentiment, whaleActivity, liquidityHealth] = await Promise.allSettled([
        this.contractAnalyzer.analyzeContract(tokenAddress),
        this.socialAnalyzer.analyzeSocial(tokenInfo.symbol, tokenInfo.name, tokenAddress),
        this.whaleAnalyzer.analyzeWhaleActivity(tokenAddress),
        this.liquidityAnalyzer.analyzeLiquidity(tokenAddress)
      ])

      // Extract results or use defaults
      const contractRiskResult = contractRisk.status === 'fulfilled' ? contractRisk.value : this.getDefaultContractRisk()
      const socialSentimentResult = socialSentiment.status === 'fulfilled' ? socialSentiment.value : this.getDefaultSocialSentiment()
      const whaleActivityResult = whaleActivity.status === 'fulfilled' ? whaleActivity.value : this.getDefaultWhaleActivity()
      const liquidityHealthResult = liquidityHealth.status === 'fulfilled' ? liquidityHealth.value : this.getDefaultLiquidityHealth()

      console.log('Analysis scores:', {
        contract: contractRiskResult.score,
        social: socialSentimentResult.score,
        whale: whaleActivityResult.score,
        liquidity: liquidityHealthResult.score
      })

      // Calculate total risk score
      const totalScore = this.calculateTotalScore(
        contractRiskResult.score,
        socialSentimentResult.score,
        whaleActivityResult.score,
        liquidityHealthResult.score
      )

      const riskLevel = this.determineRiskLevel(totalScore)
      console.log('Total score:', totalScore, 'Risk level:', riskLevel)

      // Get price data
      const priceData = await this.getPriceData(tokenAddress)

      return {
        address: tokenAddress,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        totalScore,
        riskLevel,
        contractRisk: contractRiskResult,
        socialSentiment: socialSentimentResult,
        whaleActivity: whaleActivityResult,
        liquidityHealth: liquidityHealthResult,
        timestamp: Date.now(),
        priceData
      }
    } catch (error: any) {
      console.error('Token scan error:', error)
      throw new Error(error.message || 'Failed to scan token. Please check the address and try again.')
    }
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  private async getTokenInfo(address: string): Promise<{ name: string; symbol: string; decimals: number }> {
    try {
      console.log('Fetching token info from Blockscout...')
      
      // Try v2 API first
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/tokens/${address}`, {
        timeout: 15000
      })

      if (response.data) {
        console.log('Token info found:', response.data)
        return {
          name: response.data.name || 'Unknown Token',
          symbol: response.data.symbol || 'UNKNOWN',
          decimals: parseInt(response.data.decimals || '18')
        }
      }

      throw new Error('Token not found')
    } catch (error: any) {
      console.error('Error fetching token info:', error.message)
      
      // Try alternative endpoint
      try {
        const altResponse = await axios.get(`${BLOCKSCOUT_API_URL}`, {
          params: {
            module: 'token',
            action: 'tokeninfo',
            contractaddress: address
          },
          timeout: 15000
        })

        if (altResponse.data?.result) {
          const result = Array.isArray(altResponse.data.result) 
            ? altResponse.data.result[0] 
            : altResponse.data.result

          return {
            name: result.name || result.tokenName || 'Unknown Token',
            symbol: result.symbol || result.tokenSymbol || 'UNKNOWN',
            decimals: parseInt(result.decimals || result.divisor || '18')
          }
        }
      } catch (altError) {
        console.error('Alternative endpoint also failed')
      }

      // Return generic info if all fails
      return {
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 18
      }
    }
  }

  private calculateTotalScore(
    contractScore: number,
    socialScore: number,
    whaleScore: number,
    liquidityScore: number
  ): number {
    // Weighted average based on importance
    const weights = {
      contract: 0.40,  // Contract risks are most critical
      whale: 0.25,     // Whale manipulation is very important
      social: 0.20,    // Social sentiment matters
      liquidity: 0.15  // Liquidity health
    }

    const total = 
      contractScore * weights.contract +
      socialScore * weights.social +
      whaleScore * weights.whale +
      liquidityScore * weights.liquidity

    return Math.round(total)
  }

  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score <= 30) return 'LOW'
    if (score <= 60) return 'MEDIUM'
    if (score <= 85) return 'HIGH'
    return 'CRITICAL'
  }

  private async getPriceData(tokenAddress: string): Promise<any> {
    try {
      // Get token transfers to estimate activity
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/tokens/${tokenAddress}/transfers`, {
        timeout: 10000
      })

      const transfers = response.data?.items || []
      
      return {
        current: 0,
        change24h: 0,
        change7d: 0,
        volume24h: transfers.length,
        marketCap: 0,
        holders: 0
      }
    } catch (error) {
      return {
        current: 0,
        change24h: 0,
        change7d: 0,
        volume24h: 0,
        marketCap: 0,
        holders: 0
      }
    }
  }

  private getDefaultContractRisk() {
    return {
      score: 50,
      flags: [{
        severity: 'MEDIUM' as const,
        title: 'Analysis Incomplete',
        description: 'Unable to fully analyze contract',
        points: 50
      }],
      ownershipStatus: 'UNKNOWN',
      mintable: false,
      pausable: false,
      hasHoneypot: false,
      hasHiddenFunctions: false,
      taxRate: { buy: 0, sell: 0 },
      liquidityLocked: false,
      verified: false,
      deploymentAge: 0
    }
  }

  private getDefaultSocialSentiment() {
    return {
      score: 30,
      overallSentiment: 'NEUTRAL' as const,
      platforms: {},
      botDetectionScore: 20,
      suspiciousPatterns: [],
      influencerMentions: 0,
      communityGrowth: { daily: 0, weekly: 0 }
    }
  }

  private getDefaultWhaleActivity() {
    return {
      score: 40,
      topHolders: [],
      concentration: 0,
      suspiciousWallets: [],
      recentLargeTx: [],
      clusteringDetected: false
    }
  }

  private getDefaultLiquidityHealth() {
    return {
      score: 40,
      totalLiquidity: '0',
      liquidityPairs: [],
      lockedPercentage: 0,
      recentChanges: 0,
      volatilityRisk: 50
    }
  }
}