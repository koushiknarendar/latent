import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Called once by the founder to generate the initial invite batch.
// Requires ADMIN_SECRET env var to be set.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { count = 50, inviter_id } = await req.json()
  if (!inviter_id) return NextResponse.json({ error: 'inviter_id required' }, { status: 400 })

  const supabase = await createClient()

  const rows = Array.from({ length: count }, () => ({
    inviter_id,
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
  }))

  const { data, error } = await supabase
    .from('invites')
    .insert(rows)
    .select('invite_code')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    created: data?.length,
    codes: data?.map(i => i.invite_code),
  })
}
