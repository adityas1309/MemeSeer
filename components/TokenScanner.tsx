"use client"

import { useState, useEffect } from "react"
import { Search, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react"
import { useTokenScanner } from "@/hooks/useTokenScanner"
import { useWatchlist } from "@/hooks/useWatchlist"
import { useSearchParams } from "next/navigation"

export const TokenScanner = () => {
  const searchParams = useSearchParams()
  const [tokenAddress, setTokenAddress] = useState("")
  const { analysis, isScanning, error, scanToken, reset } = useTokenScanner()
  const { addToWatchlist, isInWatchlist } = useWatchlist()

  // Auto-scan when 'scan' parameter is present in URL
  useEffect(() => {
    const scanParam = searchParams.get('scan')
    if (scanParam && !analysis && !isScanning) {
      setTokenAddress(scanParam)
      handleScan(scanParam)
    }
  }, [searchParams])

  const handleScan = async (address?: string) => {
    const addressToScan = address || tokenAddress
    if (!addressToScan) return
    
    const result = await scanToken(addressToScan)
    
    // Update leaderboard
    if (result) {
      try {
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
      } catch (e) {
        console.log('Leaderboard update failed:', e)
      }
    }
  }

  const handleAddToWatchlist = async () => {
    if (!analysis) return
    
    try {
      await addToWatchlist({
        tokenAddress: analysis.address,
        tokenName: analysis.name,
        tokenSymbol: analysis.symbol,
        lastScore: analysis.totalScore,
        autoProtectEnabled: false,
        alertThreshold: 75
      })
      
      alert(`✅ ${analysis.symbol} added to watchlist!`)
    } catch (error) {
      console.error('Failed to add to watchlist:', error)
      alert('❌ Failed to add to watchlist. Please try again.')
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-500 bg-green-500/10 border-green-500'
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500'
      case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500'
      case 'CRITICAL': return 'text-red-500 bg-red-500/10 border-red-500'
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'LOW': return <CheckCircle className="w-6 h-6" />
      case 'MEDIUM': return <Info className="w-6 h-6" />
      case 'HIGH': return <AlertTriangle className="w-6 h-6" />
      case 'CRITICAL': return <XCircle className="w-6 h-6" />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            MemeSeer
          </h1>
          <p className="text-gray-300 text-lg">AI-Powered Memecoin Risk Scanner</p>
          <p className="text-gray-400 text-sm mt-2">Protect yourself from rug pulls on Celo</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Enter Celo token address (0x...)"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => handleScan()}
              disabled={isScanning || !tokenAddress}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              {isScanning ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚡</span>
                  Scanning...
                </span>
              ) : (
                'Scan Token'
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Risk Score Card */}
            <div className={`bg-white/5 backdrop-blur-lg border ${getRiskColor(analysis.riskLevel)} rounded-2xl p-8`}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-full ${getRiskColor(analysis.riskLevel)}`}>
                    {getRiskIcon(analysis.riskLevel)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {analysis.name} ({analysis.symbol})
                    </h2>
                    <p className="text-gray-400 text-sm font-mono">{analysis.address}</p>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getRiskColor(analysis.riskLevel)} mb-2`}>
                    {analysis.totalScore}
                  </div>
                  <div className={`text-lg font-semibold ${getRiskColor(analysis.riskLevel)}`}>
                    {analysis.riskLevel} RISK
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleAddToWatchlist}
                  disabled={isInWatchlist(analysis.address)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isInWatchlist(analysis.address) ? '✓ In Watchlist' : '+ Add to Watchlist'}
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                >
                  Scan Another Token
                </button>
              </div>
            </div>

            {/* Analysis Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Contract Risk */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">CONTRACT RISK</h3>
                <div className="text-3xl font-bold text-white mb-4">{analysis.contractRisk.score}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Verified:</span>
                    <span className={analysis.contractRisk.verified ? 'text-green-400' : 'text-red-400'}>
                      {analysis.contractRisk.verified ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Age:</span>
                    <span>{analysis.contractRisk.deploymentAge} days</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Red Flags:</span>
                    <span className="text-red-400">{analysis.contractRisk.flags.length}</span>
                  </div>
                </div>
              </div>

              {/* Social Sentiment */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">SOCIAL SENTIMENT</h3>
                <div className="text-3xl font-bold text-white mb-4">{analysis.socialSentiment.score}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Overall:</span>
                    <span className={
                      analysis.socialSentiment.overallSentiment === 'POSITIVE' ? 'text-green-400' :
                      analysis.socialSentiment.overallSentiment === 'NEGATIVE' ? 'text-red-400' :
                      analysis.socialSentiment.overallSentiment === 'SUSPICIOUS' ? 'text-orange-400' :
                      'text-yellow-400'
                    }>
                      {analysis.socialSentiment.overallSentiment}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Bot Score:</span>
                    <span className="text-orange-400">{analysis.socialSentiment.botDetectionScore}%</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Warnings:</span>
                    <span className="text-red-400">{analysis.socialSentiment.suspiciousPatterns.length}</span>
                  </div>
                </div>
              </div>

              {/* Whale Activity */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">WHALE ACTIVITY</h3>
                <div className="text-3xl font-bold text-white mb-4">{analysis.whaleActivity.score}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Concentration:</span>
                    <span className={analysis.whaleActivity.concentration > 50 ? 'text-red-400' : 'text-yellow-400'}>
                      {analysis.whaleActivity.concentration.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Suspicious:</span>
                    <span className="text-orange-400">{analysis.whaleActivity.suspiciousWallets.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Clustering:</span>
                    <span className={analysis.whaleActivity.clusteringDetected ? 'text-red-400' : 'text-green-400'}>
                      {analysis.whaleActivity.clusteringDetected ? 'Detected' : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Liquidity Health */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">LIQUIDITY HEALTH</h3>
                <div className="text-3xl font-bold text-white mb-4">{analysis.liquidityHealth.score}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Locked:</span>
                    <span className={analysis.liquidityHealth.lockedPercentage > 50 ? 'text-green-400' : 'text-red-400'}>
                      {analysis.liquidityHealth.lockedPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Pairs:</span>
                    <span>{analysis.liquidityHealth.liquidityPairs.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Volatility:</span>
                    <span className="text-orange-400">{analysis.liquidityHealth.volatilityRisk}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Findings */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">⚠️ Critical Findings</h3>
              
              {analysis.contractRisk.flags.length > 0 ? (
                <div className="space-y-3">
                  {analysis.contractRisk.flags.map((flag, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg border ${
                        flag.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/50' :
                        flag.severity === 'HIGH' ? 'bg-orange-500/10 border-orange-500/50' :
                        flag.severity === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/50' :
                        'bg-blue-500/10 border-blue-500/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          flag.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                          flag.severity === 'HIGH' ? 'bg-orange-500 text-white' :
                          flag.severity === 'MEDIUM' ? 'bg-yellow-500 text-black' :
                          'bg-blue-500 text-white'
                        }`}>
                          {flag.severity}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white mb-1">{flag.title}</h4>
                          <p className="text-gray-300 text-sm">{flag.description}</p>
                        </div>
                        <span className="text-gray-400 text-sm">+{flag.points} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No critical contract issues detected</p>
                </div>
              )}
            </div>

            {/* Top Holders */}
            {analysis.whaleActivity.topHolders.length > 0 && (
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">🐋 Top Token Holders</h3>
                <div className="space-y-2">
                  {analysis.whaleActivity.topHolders.slice(0, 5).map((holder, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 font-mono">#{index + 1}</span>
                        <span className="text-gray-300 font-mono text-sm">
                          {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                        </span>
                        {holder.isContract && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                            Contract
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{holder.percentage.toFixed(2)}%</div>
                        <div className="text-gray-400 text-xs">{holder.age} days old</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}