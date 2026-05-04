import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code?.trim()) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_invite_verified')
    .eq('id', user.id)
    .single()

  if (profile?.is_invite_verified) {
    return NextResponse.json({ error: 'Already verified' }, { status: 409 })
  }

  const { data: invite } = await supabase
    .from('invites')
    .select('id, inviter_id, invitee_id, status, expires_at')
    .eq('invite_code', code.trim().toLowerCase())
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'This code has already been used' }, { status: 409 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite code has expired' }, { status: 410 })
  }

  if (invite.inviter_id === user.id) {
    return NextResponse.json({ error: "You can't use your own invite code" }, { status: 400 })
  }

  const { error: inviteError } = await supabase
    .from('invites')
    .update({ status: 'accepted', invitee_id: user.id })
    .eq('id', invite.id)

  if (inviteError) {
    return NextResponse.json({ error: 'Failed to redeem invite' }, { status: 500 })
  }

  await supabase
    .from('profiles')
    .update({ is_invite_verified: true })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}
