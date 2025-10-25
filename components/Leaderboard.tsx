"use client"

import { useEffect, useState } from "react"
import { Trophy, Skull, RefreshCw } from "lucide-react"

interface LeaderboardToken {
  address: string
  name: string
  symbol: string
  score: number
  scans: number
  timestamp: number
}

export const Leaderboard = () => {
  const [safest, setSafest] = useState<LeaderboardToken[]>([])
  const [dangerous, setDangerous] = useState<LeaderboardToken[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadLeaderboards()
  }, [])

  const loadLeaderboards = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/leaderboard')
      if (response.ok) {
        const data = await response.json()
        setSafest(data.safe || [])
        setDangerous(data.danger || [])
      }
    } catch (error) {
      console.log('Error loading leaderboards:', error)
      setSafest([])
      setDangerous([])
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-500'
    if (score <= 60) return 'text-yellow-500'
    if (score <= 85) return 'text-orange-500'
    return 'text-red-500'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-spin text-6xl">⚡</div>
          <p className="text-gray-300 mt-4">Loading leaderboards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">🏆 Community Leaderboard</h1>
          <p className="text-gray-300 mb-4">Discover the safest and most dangerous tokens on Celo</p>
          <button
            onClick={loadLeaderboards}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Safest Tokens */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">Safest Tokens</h2>
            </div>

            {safest.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 text-center">
                <p className="text-gray-400">No safe tokens reported yet</p>
                <p className="text-gray-500 text-sm mt-2">Be the first to scan tokens!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {safest.map((token, index) => (
                  <div
                    key={token.address}
                    className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-gray-400">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">
                          {token.name} ({token.symbol})
                        </h3>
                        <p className="text-gray-400 text-sm font-mono">
                          {token.address.slice(0, 10)}...{token.address.slice(-8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getRiskColor(token.score)}`}>
                          {token.score}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {token.scans} scans
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most Dangerous Tokens */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Skull className="w-8 h-8 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Rug Pull Graveyard</h2>
            </div>

            {dangerous.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 text-center">
                <p className="text-gray-400">No dangerous tokens reported yet</p>
                <p className="text-gray-500 text-sm mt-2">Let's keep it that way!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dangerous.map((token, index) => (
                  <div
                    key={token.address}
                    className="bg-red-500/5 backdrop-blur-lg border border-red-500/20 rounded-xl p-4 hover:bg-red-500/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-red-400">
                        ☠️
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">
                          {token.name} ({token.symbol})
                        </h3>
                        <p className="text-gray-400 text-sm font-mono">
                          {token.address.slice(0, 10)}...{token.address.slice(-8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getRiskColor(token.score)}`}>
                          {token.score}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {token.scans} scans
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-white mb-2">
              {safest.length + dangerous.length}
            </div>
            <div className="text-gray-400">Total Scanned Tokens</div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-green-500 mb-2">
              {safest.length}
            </div>
            <div className="text-gray-400">Safe Tokens</div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-red-500 mb-2">
              {dangerous.length}
            </div>
            <div className="text-gray-400">High Risk Tokens</div>
          </div>
        </div>
      </div>
    </div>
  )
}