"use client"

import { useWatchlist } from "@/hooks/useWatchlist"
import { useTokenScanner } from "@/hooks/useTokenScanner"
import { Trash2, RefreshCw, Bell, BellOff, TrendingUp, TrendingDown } from "lucide-react"
import { useState } from "react"

export const Watchlist = () => {
  const { watchlist, isLoading, removeFromWatchlist, updateWatchlistItem } = useWatchlist()
  const { scanToken } = useTokenScanner()
  const [scanning, setScanning] = useState<string | null>(null)

  const handleRescan = async (tokenAddress: string) => {
    setScanning(tokenAddress)
    try {
      const result = await scanToken(tokenAddress)
      await updateWatchlistItem(tokenAddress, {
        lastScore: result.totalScore
      })
    } catch (error) {
      console.error('Rescan failed:', error)
    } finally {
      setScanning(null)
    }
  }

  const toggleAutoProtect = async (tokenAddress: string, current: boolean) => {
    await updateWatchlistItem(tokenAddress, {
      autoProtectEnabled: !current
    })
  }

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-500 bg-green-500/10 border-green-500'
    if (score <= 60) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500'
    if (score <= 85) return 'text-orange-500 bg-orange-500/10 border-orange-500'
    return 'text-red-500 bg-red-500/10 border-red-500'
  }

  const getRiskLevel = (score: number) => {
    if (score <= 30) return 'LOW'
    if (score <= 60) return 'MEDIUM'
    if (score <= 85) return 'HIGH'
    return 'CRITICAL'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-spin text-6xl">⚡</div>
          <p className="text-gray-300 mt-4">Loading watchlist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📊 Watchlist</h1>
          <p className="text-gray-300">Monitor your tracked tokens in real-time</p>
        </div>

        {watchlist.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">👀</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Tokens Watched</h2>
            <p className="text-gray-400 mb-6">Start by scanning a token and adding it to your watchlist</p>
            <a 
              href="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              Scan a Token
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {watchlist.map((item) => (
              <div
                key={item.tokenAddress}
                className={`bg-white/5 backdrop-blur-lg border ${getRiskColor(item.lastScore)} rounded-xl p-6 transition-all hover:bg-white/10`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`text-4xl font-bold ${getRiskColor(item.lastScore)}`}>
                      {item.lastScore}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-white">
                          {item.tokenName} ({item.tokenSymbol})
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getRiskColor(item.lastScore)}`}>
                          {getRiskLevel(item.lastScore)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm font-mono">{item.tokenAddress}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAutoProtect(item.tokenAddress, item.autoProtectEnabled)}
                      className={`p-3 rounded-lg transition-all ${
                        item.autoProtectEnabled
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                      title={item.autoProtectEnabled ? 'Auto-protect enabled' : 'Auto-protect disabled'}
                    >
                      {item.autoProtectEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={() => handleRescan(item.tokenAddress)}
                      disabled={scanning === item.tokenAddress}
                      className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Rescan token"
                    >
                      <RefreshCw className={`w-5 h-5 ${scanning === item.tokenAddress ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                      onClick={() => removeFromWatchlist(item.tokenAddress)}
                      className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {item.autoProtectEnabled && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <Bell className="w-4 h-4" />
                      <span>Auto-protect active • Alert threshold: {item.alertThreshold}</span>
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