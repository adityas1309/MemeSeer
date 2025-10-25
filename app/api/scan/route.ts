// app/api/scan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ScannerService } from '@/lib/services/scannerService'

const scannerService = new ScannerService()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenAddress } = body

    if (!tokenAddress) {
      return NextResponse.json(
        { error: 'Token address is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const analysis = await scannerService.scanToken(tokenAddress)

    return NextResponse.json(analysis, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Scan API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to scan token' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tokenAddress = searchParams.get('address')

  if (!tokenAddress) {
    return NextResponse.json(
      { error: 'Token address is required' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    const analysis = await scannerService.scanToken(tokenAddress)
    return NextResponse.json(analysis, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Scan API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to scan token' },
      { status: 500, headers: corsHeaders }
    )
  }
}
