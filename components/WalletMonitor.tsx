"use client"

import { useState } from "react"
import { Wallet, RefreshCw, AlertTriangle, Shield, Eye, TrendingUp, Scan } from "lucide-react"
import { useWalletTokens } from "@/hooks/useWalletTokens"
import { useTokenScanner } from "@/hooks/useTokenScanner"
import { useWatchlist } from "@/hooks/useWatchlist"

export const WalletMonitor = () => {
  const { 
    tokens, 
    isLoading, 
    error, 
    isConnected, 
    walletAddress, 
    refetch, 
    updateTokenRisk,
    formatBalance 
  } = useWalletTokens()
  
  const { scanToken } = useTokenScanner()
  const { addToWatchlist, isInWatchlist } = useWatchlist()
  
  const [scanningToken, setScanningToken] = useState<string | null>(null)
  const [autoScanEnabled, setAutoScanEnabled] = useState(false)
  const [scanningAll, setScanningAll] = useState(false)

  const handleScanToken = async (tokenAddress: string) => {
    setScanningToken(tokenAddress)
    try {
      const result = await scanToken(tokenAddress)
      updateTokenRisk(tokenAddress, result.totalScore, result.riskLevel)
      
      // Update leaderboard
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: result.address,
          name: result.name,
          symbol: result.symbol,
          score: result.totalScore
        })
      })
    } catch (error) {
      console.error('Scan failed:', error)
    } finally {
      setScanningToken(null)
    }
  }

  const handleScanAll = async () => {
    setScanningAll(true)
    
    for (const token of tokens) {
      if (!token.riskScore) {
        await handleScanToken(token.address)
        // Add delay between scans to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    setScanningAll(false)
  }

  const handleAddToWatchlist = (token: typeof tokens[0]) => {
    addToWatchlist({
      tokenAddress: token.address,
      tokenName: token.name,
      tokenSymbol: token.symbol,
      lastScore: token.riskScore || 0,
      autoProtectEnabled: false,
      alertThreshold: 75
    })
  }

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'LOW': return 'text-green-500 bg-green-500/10 border-green-500'
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500'
      case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500'
      case 'CRITICAL': return 'text-red-500 bg-red-500/10 border-red-500'
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500'
    }
  }

  const getRiskIcon = (level?: string) => {
    switch (level) {
      case 'LOW': return <Shield className="w-5 h-5" />
      case 'MEDIUM': return <Eye className="w-5 h-5" />
      case 'HIGH': return <AlertTriangle className="w-5 h-5" />
      case 'CRITICAL': return <AlertTriangle className="w-5 h-5" />
      default: return <Scan className="w-5 h-5" />
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-12 text-center">
            <Wallet className="w-20 h-20 mx-auto mb-6 text-purple-400" />
            <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300 mb-8">
              Connect your wallet to monitor all tokens and get real-time risk assessments
            </p>
            <div className="text-sm text-gray-400">
              Click the "Connect Wallet" button in the top right corner
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-spin text-6xl mb-4">⚡</div>
          <p className="text-gray-300">Loading your wallet tokens...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Error Loading Tokens</h2>
            <p className="text-red-300 mb-6">{error}</p>
            <button
              onClick={refetch}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const scannedTokens = tokens.filter(t => t.riskScore !== undefined)
  const unscannedTokens = tokens.filter(t => t.riskScore === undefined)
  const highRiskTokens = tokens.filter(t => t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">👛 Wallet Monitor</h1>
              <p className="text-gray-300">Real-time risk assessment for all your tokens</p>
              <p className="text-gray-400 text-sm font-mono mt-1">
                {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={refetch}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleScanAll}
                disabled={scanningAll || unscannedTokens.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {scanningAll ? (
                  <>
                    <span className="animate-spin">⚡</span>
                    Scanning All...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5" />
                    Scan All ({unscannedTokens.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Total Tokens</div>
            <div className="text-3xl font-bold text-white">{tokens.length}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Scanned</div>
            <div className="text-3xl font-bold text-green-500">{scannedTokens.length}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Not Scanned</div>
            <div className="text-3xl font-bold text-yellow-500">{unscannedTokens.length}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">High Risk</div>
            <div className="text-3xl font-bold text-red-500">{highRiskTokens.length}</div>
          </div>
        </div>

        {tokens.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🪙</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Tokens Found</h2>
            <p className="text-gray-400">This wallet doesn't hold any ERC-20 tokens</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tokens.map((token) => (
              <div
                key={token.address}
                className={`bg-white/5 backdrop-blur-lg border ${
                  token.riskLevel ? getRiskColor(token.riskLevel) : 'border-white/10'
                } rounded-xl p-6 transition-all hover:bg-white/10`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Risk Indicator */}
                    <div className={`flex items-center justify-center w-16 h-16 rounded-full ${
                      token.riskLevel ? getRiskColor(token.riskLevel) : 'bg-gray-500/10'
                    }`}>
                      {token.riskScore !== undefined ? (
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {token.riskScore}
                          </div>
                        </div>
                      ) : (
                        getRiskIcon(token.riskLevel)
                      )}
                    </div>

                    {/* Token Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-white">
                          {token.name} ({token.symbol})
                        </h3>
                        {token.riskLevel && (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getRiskColor(token.riskLevel)}`}>
                            {token.riskLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm font-mono mb-1">
                        {token.address.slice(0, 10)}...{token.address.slice(-8)}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-300">
                          Balance: <span className="font-semibold text-white">
                            {formatBalance(token.balance, token.decimals)} {token.symbol}
                          </span>
                        </span>
                        {token.lastScanned && (
                          <span className="text-gray-500">
                            Scanned {new Date(token.lastScanned).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleScanToken(token.address)}
                      disabled={scanningToken === token.address}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all disabled:opacity-50"
                    >
                      {scanningToken === token.address ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Scan className="w-4 h-4" />
                          {token.riskScore ? 'Rescan' : 'Scan'}
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleAddToWatchlist(token)}
                      disabled={isInWatchlist(token.address)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye className="w-4 h-4" />
                      {isInWatchlist(token.address) ? 'Watching' : 'Watch'}
                    </button>
                  </div>
                </div>

                {/* Risk Warning */}
                {(token.riskLevel === 'HIGH' || token.riskLevel === 'CRITICAL') && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-2 text-sm text-red-400">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold">High Risk Detected:</span> This token shows significant risk factors. 
                        Consider reviewing the full analysis before making any decisions.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}