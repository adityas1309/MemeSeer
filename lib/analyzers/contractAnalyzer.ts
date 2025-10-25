import axios from 'axios'
import { ContractRiskAnalysis, ContractFlag } from '@/types'

// Celo Sepolia Blockscout API
const BLOCKSCOUT_API_URL = 'https://celo-sepolia.blockscout.com/api'

export class ContractAnalyzer {
  
  async analyzeContract(tokenAddress: string): Promise<ContractRiskAnalysis> {
    try {
      console.log('Analyzing contract:', tokenAddress)
      
      const [sourceCode, contractInfo, tokenInfo] = await Promise.all([
        this.getSourceCode(tokenAddress),
        this.getContractCreationTime(tokenAddress),
        this.getTokenInfo(tokenAddress)
      ])

      const flags = this.detectRedFlags(sourceCode, contractInfo, tokenInfo)
      const score = this.calculateContractScore(flags)
      
      let deploymentAge = 0
      if (contractInfo?.timestamp) {
        const ageInMs = Date.now() - contractInfo.timestamp
        deploymentAge = Math.floor(ageInMs / (1000 * 60 * 60 * 24))
        console.log(`✅ Contract age: ${deploymentAge} days (deployed: ${new Date(contractInfo.timestamp).toISOString()})`)
      } else {
        console.log('⚠️ Could not determine contract age')
      }

      return {
        score,
        flags,
        ownershipStatus: this.checkOwnership(sourceCode),
        mintable: this.checkMintable(sourceCode),
        pausable: this.checkPausable(sourceCode),
        hasHoneypot: false,
        hasHiddenFunctions: this.checkHiddenFunctions(sourceCode),
        taxRate: this.getTaxRates(sourceCode),
        liquidityLocked: false,
        lockDuration: undefined,
        verified: sourceCode !== null && sourceCode.length > 0,
        deploymentAge
      }
    } catch (error) {
      console.error('Contract analysis error:', error)
      throw error
    }
  }

  private async getContractCreationTime(address: string): Promise<any> {
    try {
      console.log(`🔍 Finding creation time for ${address}`)
      
      // Method 1: Try to get all transactions and find the oldest
      const allTxResponse = await axios.get(`${BLOCKSCOUT_API_URL}/v2/addresses/${address}/transactions`, {
        timeout: 15000
      })

      if (allTxResponse.data?.items && allTxResponse.data.items.length > 0) {
        // Sort by timestamp to find oldest
        const sortedTxs = allTxResponse.data.items.sort((a: any, b: any) => {
          const timeA = new Date(a.timestamp || 0).getTime()
          const timeB = new Date(b.timestamp || 0).getTime()
          return timeA - timeB
        })

        const oldestTx = sortedTxs[0]
        if (oldestTx?.timestamp) {
          const timestamp = new Date(oldestTx.timestamp).getTime()
          console.log(`✅ Found creation via transactions: ${new Date(timestamp).toISOString()}`)
          return {
            timestamp,
            creator: oldestTx.from?.hash || oldestTx.from,
            isContract: true
          }
        }
      }

      // Method 2: Try token endpoint which sometimes has creation info
      const tokenResponse = await axios.get(`${BLOCKSCOUT_API_URL}/v2/tokens/${address}`, {
        timeout: 10000
      })

      if (tokenResponse.data?.created_at) {
        const timestamp = new Date(tokenResponse.data.created_at).getTime()
        console.log(`✅ Found creation via token API: ${new Date(timestamp).toISOString()}`)
        return {
          timestamp,
          creator: null,
          isContract: true
        }
      }

      // Method 3: Check address endpoint
      const addressResponse = await axios.get(`${BLOCKSCOUT_API_URL}/v2/addresses/${address}`, {
        timeout: 10000
      })

      if (addressResponse.data?.created_at) {
        const timestamp = new Date(addressResponse.data.created_at).getTime()
        console.log(`✅ Found creation via address API: ${new Date(timestamp).toISOString()}`)
        return {
          timestamp,
          creator: addressResponse.data.creator_address_hash,
          isContract: addressResponse.data.is_contract
        }
      }

      // Method 4: Get token transfers and find oldest
      const transfersResponse = await axios.get(`${BLOCKSCOUT_API_URL}/v2/tokens/${address}/transfers`, {
        timeout: 10000
      })

      if (transfersResponse.data?.items && transfersResponse.data.items.length > 0) {
        const sortedTransfers = transfersResponse.data.items.sort((a: any, b: any) => {
          const timeA = new Date(a.timestamp || 0).getTime()
          const timeB = new Date(b.timestamp || 0).getTime()
          return timeA - timeB
        })

        const oldestTransfer = sortedTransfers[0]
        if (oldestTransfer?.timestamp) {
          const timestamp = new Date(oldestTransfer.timestamp).getTime()
          console.log(`✅ Found creation via transfers: ${new Date(timestamp).toISOString()}`)
          return {
            timestamp,
            creator: oldestTransfer.from?.hash || oldestTransfer.from,
            isContract: true
          }
        }
      }

      console.log('⚠️ Could not determine creation time via any method')
      return null
    } catch (error) {
      console.error('Error fetching contract creation time:', error)
      return null
    }
  }

  private async getSourceCode(address: string): Promise<string | null> {
    try {
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/smart-contracts/${address}`, {
        timeout: 10000
      })

      if (response.data && response.data.source_code) {
        return response.data.source_code
      }
      
      // Try alternative endpoint
      const altResponse = await axios.get(`${BLOCKSCOUT_API_URL}`, {
        params: {
          module: 'contract',
          action: 'getsourcecode',
          address
        },
        timeout: 10000
      })

      if (altResponse.data?.result?.[0]?.SourceCode) {
        return altResponse.data.result[0].SourceCode
      }

      return null
    } catch (error) {
      console.error('Error fetching source code:', error)
      return null
    }
  }

  private async getTokenInfo(address: string): Promise<any> {
    try {
      const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/tokens/${address}`, {
        timeout: 10000
      })
      return response.data || null
    } catch (error) {
      console.error('Error fetching token info:', error)
      return null
    }
  }

  private detectRedFlags(
    sourceCode: string | null,
    contractInfo: any,
    tokenInfo: any
  ): ContractFlag[] {
    const flags: ContractFlag[] = []

    if (!sourceCode || sourceCode.length === 0) {
      flags.push({
        severity: 'HIGH',
        title: 'Unverified Contract',
        description: 'Source code is not verified on blockchain explorer',
        points: 25
      })
      return flags
    }

    if (this.containsPattern(sourceCode, /function\s+mint\s*\(/i)) {
      flags.push({
        severity: 'CRITICAL',
        title: 'Mint Function Detected',
        description: 'Contract contains mint function that could inflate supply',
        points: 30
      })
    }

    if (this.containsPattern(sourceCode, /onlyOwner|Ownable/i)) {
      flags.push({
        severity: 'MEDIUM',
        title: 'Owner Controls',
        description: 'Contract has owner-controlled functions',
        points: 15
      })
    }

    if (this.containsPattern(sourceCode, /blacklist|blacklisted/i)) {
      flags.push({
        severity: 'CRITICAL',
        title: 'Blacklist Function',
        description: 'Contract can blacklist addresses from trading',
        points: 30
      })
    }

    if (this.containsPattern(sourceCode, /pause|whenNotPaused/i)) {
      flags.push({
        severity: 'HIGH',
        title: 'Pausable Contract',
        description: 'Trading can be paused by owner',
        points: 25
      })
    }

    if (this.containsPattern(sourceCode, /proxy|upgradeable|UUPS|delegatecall/i)) {
      flags.push({
        severity: 'HIGH',
        title: 'Proxy/Upgradeable Pattern',
        description: 'Contract logic can be changed after deployment',
        points: 20
      })
    }

    const taxMatch = sourceCode.match(/tax\D+(\d+)/i)
    if (taxMatch && parseInt(taxMatch[1]) > 10) {
      flags.push({
        severity: 'HIGH',
        title: 'High Transaction Tax',
        description: `Transaction tax may exceed 10%`,
        points: 20
      })
    }

    if (this.containsPattern(sourceCode, /selfdestruct|suicide/i)) {
      flags.push({
        severity: 'CRITICAL',
        title: 'Self-Destruct Function',
        description: 'Contract can be destroyed, potentially locking funds',
        points: 30
      })
    }

    // Contract age check - now with better messaging
    if (contractInfo?.timestamp) {
      const ageInDays = Math.floor((Date.now() - contractInfo.timestamp) / (1000 * 60 * 60 * 24))
      
      if (ageInDays === 0) {
        flags.push({
          severity: 'HIGH',
          title: 'Brand New Contract',
          description: `Contract deployed today (less than 24 hours old)`,
          points: 20
        })
      } else if (ageInDays < 7) {
        flags.push({
          severity: 'MEDIUM',
          title: 'Very New Contract',
          description: `Contract deployed ${ageInDays} day${ageInDays !== 1 ? 's' : ''} ago`,
          points: 15
        })
      } else if (ageInDays < 30) {
        flags.push({
          severity: 'LOW',
          title: 'Recently Deployed',
          description: `Contract is ${ageInDays} days old`,
          points: 5
        })
      }
    }

    return flags
  }

  private containsPattern(text: string, pattern: RegExp): boolean {
    return pattern.test(text)
  }

  private calculateContractScore(flags: ContractFlag[]): number {
    const totalPoints = flags.reduce((sum, flag) => sum + flag.points, 0)
    return Math.min(totalPoints, 100)
  }

  private checkOwnership(sourceCode: string | null): string {
    if (!sourceCode) return 'UNKNOWN'

    const hasOwner = this.containsPattern(sourceCode, /owner\s*\(\)/i)
    const isRenounced = this.containsPattern(sourceCode, /renounceOwnership|owner.*=.*address\(0\)/i)

    if (isRenounced) return 'RENOUNCED'
    if (hasOwner) return 'ACTIVE_OWNER'
    return 'NO_OWNER_FUNCTION'
  }

  private checkMintable(sourceCode: string | null): boolean {
    if (!sourceCode) return false
    return this.containsPattern(sourceCode, /function\s+mint\s*\(/i)
  }

  private checkPausable(sourceCode: string | null): boolean {
    if (!sourceCode) return false
    return this.containsPattern(sourceCode, /pause|whenNotPaused/i)
  }

  private checkHiddenFunctions(sourceCode: string | null): boolean {
    if (!sourceCode) return false
    
    const suspiciousPatterns = [
      /assembly\s*\{/i,
      /delegatecall/i,
      /callcode/i,
      /\.call\(/i
    ]

    return suspiciousPatterns.some(pattern => this.containsPattern(sourceCode, pattern))
  }

  private getTaxRates(sourceCode: string | null): { buy: number; sell: number } {
    if (!sourceCode) return { buy: 0, sell: 0 }

    const buyTaxMatch = sourceCode.match(/buyTax\D+(\d+)/i)
    const sellTaxMatch = sourceCode.match(/sellTax\D+(\d+)/i)

    return {
      buy: buyTaxMatch ? parseInt(buyTaxMatch[1]) : 0,
      sell: sellTaxMatch ? parseInt(sellTaxMatch[1]) : 0
    }
  }
}