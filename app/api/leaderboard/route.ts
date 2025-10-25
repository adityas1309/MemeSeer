import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for leaderboard (replace with database in production)
const leaderboardStore = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenAddress, name, symbol, score } = body

    if (!tokenAddress || !name || !symbol || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Determine category
    const category = score <= 30 ? 'safe' : 'danger'
    const key = `leaderboard:${category}:${tokenAddress}`

    // Get existing data
    const existingData = leaderboardStore.get(key)

    // Update or create entry
    const tokenData = {
      address: tokenAddress,
      name,
      symbol,
      score,
      scans: existingData ? existingData.scans + 1 : 1,
      timestamp: Date.now()
    }

    leaderboardStore.set(key, tokenData)

    return NextResponse.json({ success: true, data: tokenData })
  } catch (error: any) {
    console.error('Leaderboard update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update leaderboard' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const safeTokens: any[] = []
    const dangerTokens: any[] = []

    for (const [key, value] of leaderboardStore.entries()) {
      if (key.includes(':safe:')) {
        safeTokens.push(value)
      } else if (key.includes(':danger:')) {
        dangerTokens.push(value)
      }
    }

    return NextResponse.json({
      safe: safeTokens.sort((a, b) => a.score - b.score).slice(0, 10),
      danger: dangerTokens.sort((a, b) => b.score - a.score).slice(0, 10)
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}