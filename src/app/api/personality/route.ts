import { NextRequest, NextResponse } from 'next/server'
import { extractPersonalityVector } from '@/lib/anthropic/icebreaker'

export async function POST(req: NextRequest) {
  try {
    const { answers } = await req.json()
    const [question_1, question_2, question_3] = answers

    const vector = await extractPersonalityVector({ question_1, question_2, question_3 })
    return NextResponse.json({ vector })
  } catch {
    return NextResponse.json({ vector: {} }, { status: 200 })
  }
}
