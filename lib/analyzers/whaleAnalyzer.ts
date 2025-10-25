import axios from 'axios'
import { WhaleActivityAnalysis, TokenHolder, SuspiciousWallet, Transaction } from '@/types'

const BLOCKSCOUT_API_URL = 'https://celo-sepolia.blockscout.com/api'

export class WhaleAnalyzer {
  
  async analyzeWhaleActivity(tokenAddress: string): Promise<WhaleActivityAnalysis> {
    try {
      console.log('Analyzing whale activity for:', tokenAddress)
      
      const [holders, transactions, totalSupply] = await Promise.all([
        this.getTopHolders(tokenAddress),
        this.getRecentTransactions(tokenAddress),
        this.getTotalSupply(tokenAddress)
      ])

      const concentration = this.calculateConcentration(holders, totalSupply)
      const suspiciousWallets = this.detectSuspiciousWallets(holders, transactions)
      const clusteringDetected = this.detectClustering(transactions)
      
      const score = this.calculateWhaleScore(
        concentration,
        suspiciousWallets.length,
        clusteringDetected,
        transactions,
        holders
      )

      return {
        score,
        topHolders: holders.slice(0, 10),
        concentration,
        suspiciousWallets,
        recentLargeTx: this.filterLargeTransactions(transactions, totalSupply),
        clusteringDetected
      }
    } catch (error) {
      console.error('Whale analysis error:', error)
      throw error
    }
  }

  private async getTopHolders(tokenAddress: string): Promise<TokenHolder[]> {
    try {
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/tokens/${tokenAddress}/holders`, {
        params: { page: 1, limit: 50 },
        timeout: 10000
      })

      if (response.data?.items) {
        const totalSupply = response.data.items.reduce(
          (sum: number, item: any) => sum + parseFloat(item.value || '0'), 
          0
        )

        const holders = await Promise.all(
          response.data.items.slice(0, 20).map(async (holder: any) => {
            const balance = parseFloat(holder.value || '0')
            const percentage = totalSupply > 0 ? (balance / totalSupply) * 100 : 0
            
            return {
              address: holder.address?.hash || holder.address,
              balance: holder.value || '0',
              percentage,
              age: await this.getWalletAge(holder.address?.hash || holder.address),
              isContract: holder.address?.is_contract || false
            }
          })
        )

        return holders
      }

      return []
    } catch (error) {
      console.error('Error fetching holders:', error)
      return []
    }
  }

  private async getRecentTransactions(tokenAddress: string): Promise<Transaction[]> {
    try {
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/tokens/${tokenAddress}/transfers`, {
        params: { type: 'ERC-20' },
        timeout: 10000
      })

      if (response.data?.items) {
        return response.data.items.slice(0, 100).map((tx: any) => ({
          hash: tx.tx_hash,
          from: tx.from?.hash || tx.from,
          to: tx.to?.hash || tx.to,
          amount: tx.total?.value || tx.value || '0',
          timestamp: tx.timestamp ? new Date(tx.timestamp).getTime() / 1000 : Date.now() / 1000,
          type: this.determineTransactionType(tx)
        }))
      }

      return []
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  }

  private async getTotalSupply(tokenAddress: string): Promise<string> {
    try {
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/tokens/${tokenAddress}`, {
        timeout: 10000
      })

      return response.data?.total_supply || '1000000000000000000000000'
    } catch (error) {
      console.error('Error fetching total supply:', error)
      return '1000000000000000000000000'
    }
  }

  private async getWalletAge(address: string): Promise<number> {
    try {
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/addresses/${address}/transactions`, {
        params: { filter: 'to' },
        timeout: 10000
      })

      if (response.data?.items && response.data.items.length > 0) {
        const oldestTx = response.data.items[response.data.items.length - 1]
        if (oldestTx.timestamp) {
          const timestamp = new Date(oldestTx.timestamp).getTime()
          return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24))
        }
      }

      return 0
    } catch (error) {
      return 0
    }
  }

  private determineTransactionType(tx: any): 'BUY' | 'SELL' | 'TRANSFER' {
    // Simplified - in production, check DEX router addresses
    return 'TRANSFER'
  }

  private calculateConcentration(holders: TokenHolder[], totalSupply: string): number {
    if (holders.length === 0) return 0

    const top10Holdings = holders.slice(0, 10).reduce((sum, holder) => 
      sum + holder.percentage, 0
    )

    return Math.round(top10Holdings * 100) / 100
  }

  private detectSuspiciousWallets(
    holders: TokenHolder[],
    transactions: Transaction[]
  ): SuspiciousWallet[] {
    const suspicious: SuspiciousWallet[] = []

    holders.forEach(holder => {
      const reasons: string[] = []
      let riskLevel = 'LOW'

      // New wallet with large holdings
      if (holder.age < 7 && holder.percentage > 5) {
        reasons.push(`New wallet (<7 days) holding ${holder.percentage.toFixed(2)}% of supply`)
        riskLevel = 'HIGH'
      }

      // Very high concentration
      if (holder.percentage > 20) {
        reasons.push(`Controls ${holder.percentage.toFixed(2)}% of total supply`)
        riskLevel = holder.percentage > 30 ? 'HIGH' : 'MEDIUM'
      }

      // Contract holder
      if (holder.isContract && holder.percentage > 10) {
        reasons.push('Contract address holding significant supply')
        riskLevel = 'MEDIUM'
      }

      // Coordinated activity
      const relatedTxs = transactions.filter(tx => 
        tx.from === holder.address || tx.to === holder.address
      )
      const recentTxs = relatedTxs.filter(tx => 
        Date.now() / 1000 - tx.timestamp < 3600
      )
      if (recentTxs.length > 10) {
        reasons.push('High transaction frequency in last hour')
        riskLevel = 'HIGH'
      }

      if (reasons.length > 0) {
        suspicious.push({
          address: holder.address,
          reason: reasons.join('; '),
          riskLevel,
          connectedWallets: 0
        })
      }
    })

    return suspicious
  }

  private detectClustering(transactions: Transaction[]): boolean {
    const timeWindows: { [key: number]: Transaction[] } = {}

    transactions.forEach(tx => {
      const windowKey = Math.floor(tx.timestamp / 300) // 5-minute windows
      if (!timeWindows[windowKey]) {
        timeWindows[windowKey] = []
      }
      timeWindows[windowKey].push(tx)
    })

    // Check for suspicious clusters
    for (const window in timeWindows) {
      const txs = timeWindows[window]
      if (txs.length >= 5) {
        return true
      }
    }

    return false
  }

  private filterLargeTransactions(
    transactions: Transaction[],
    totalSupply: string
  ): Transaction[] {
    const supply = parseFloat(totalSupply)
    
    return transactions
      .filter(tx => {
        const amount = parseFloat(tx.amount)
        const percentage = (amount / supply) * 100
        return percentage > 0.5 // Transactions moving >0.5% of supply
      })
      .slice(0, 20)
  }

  private calculateWhaleScore(
    concentration: number,
    suspiciousCount: number,
    clustering: boolean,
    transactions: Transaction[],
    holders: TokenHolder[]
  ): number {
    let score = 0

    // Concentration scoring
    if (concentration > 80) score += 40
    else if (concentration > 60) score += 30
    else if (concentration > 40) score += 20
    else if (concentration > 20) score += 10

    // Suspicious wallets
    score += Math.min(suspiciousCount * 8, 30)

    // Clustering detection
    if (clustering) score += 15

    // New holders with large positions
    const newWhales = holders.filter(h => h.age < 7 && h.percentage > 5)
    score += Math.min(newWhales.length * 10, 20)

    return Math.min(score, 100)
  }
}