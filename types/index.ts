export interface TokenAnalysis {
  address: string
  name: string
  symbol: string
  totalScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  contractRisk: ContractRiskAnalysis
  socialSentiment: SocialSentimentAnalysis
  whaleActivity: WhaleActivityAnalysis
  liquidityHealth: LiquidityHealthAnalysis
  timestamp: number
  priceData?: PriceData
}

export interface ContractRiskAnalysis {
  score: number
  flags: ContractFlag[]
  ownershipStatus: string
  mintable: boolean
  pausable: boolean
  hasHoneypot: boolean
  hasHiddenFunctions: boolean
  taxRate: {
    buy: number
    sell: number
  }
  liquidityLocked: boolean
  lockDuration?: number
  verified: boolean
  deploymentAge: number
}

export interface ContractFlag {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  points: number
}

export interface SocialSentimentAnalysis {
  score: number
  overallSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'SUSPICIOUS'
  platforms: {
    twitter?: PlatformMetrics
    telegram?: PlatformMetrics
  }
  botDetectionScore: number
  suspiciousPatterns: string[]
  influencerMentions: number
  communityGrowth: {
    daily: number
    weekly: number
  }
}

export interface PlatformMetrics {
  followers: number
  engagement: number
  sentiment: number
  botPercentage: number
  recentActivity: number
}

export interface WhaleActivityAnalysis {
  score: number
  topHolders: TokenHolder[]
  concentration: number
  suspiciousWallets: SuspiciousWallet[]
  recentLargeTx: Transaction[]
  clusteringDetected: boolean
}

export interface TokenHolder {
  address: string
  balance: string
  percentage: number
  age: number
  isContract: boolean
}

export interface SuspiciousWallet {
  address: string
  reason: string
  riskLevel: string
  connectedWallets: number
}

export interface Transaction {
  hash: string
  from: string
  to: string
  amount: string
  timestamp: number
  type: 'BUY' | 'SELL' | 'TRANSFER'
}

export interface LiquidityHealthAnalysis {
  score: number
  totalLiquidity: string
  liquidityPairs: LiquidityPair[]
  lockedPercentage: number
  recentChanges: number
  volatilityRisk: number
}

export interface LiquidityPair {
  pair: string
  liquidity: string
  locked: boolean
  lockDuration?: number
}

export interface PriceData {
  current: number
  change24h: number
  change7d: number
  volume24h: number
  marketCap: number
  holders: number
}

export interface ScanHistory {
  tokenAddress: string
  scans: {
    timestamp: number
    score: number
    riskLevel: string
  }[]
}

export interface WatchlistItem {
  tokenAddress: string
  tokenName: string
  tokenSymbol: string
  addedAt: number
  lastScore: number
  autoProtectEnabled: boolean
  alertThreshold: number
}