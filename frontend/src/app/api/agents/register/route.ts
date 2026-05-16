import { NextRequest, NextResponse } from 'next/server'

const OPERATOR_URL = process.env.NEXT_PUBLIC_OPERATOR_URL ?? 'http://127.0.0.1:8402'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${OPERATOR_URL}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
