import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_ACTIVE_INVITES = 3
const MIN_CONVERSATIONS_REQUIRED = 1

export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_onboarded, is_invite_verified')
    .eq('id', user.id)
    .single()

  if (!profile?.is_onboarded || !profile?.is_invite_verified) {
    return NextResponse.json({ error: 'Complete your profile first' }, { status: 403 })
  }

  // Must have completed at least 1 real conversation
  const { count: convCount } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .eq('status', 'closed')

  if ((convCount || 0) < MIN_CONVERSATIONS_REQUIRED) {
    return NextResponse.json(
      { error: 'Have your first conversation before inviting others' },
      { status: 403 }
    )
  }

  // Check active invite cap
  const { count: activeCount } = await supabase
    .from('invites')
    .select('*', { count: 'exact', head: true })
    .eq('inviter_id', user.id)
    .eq('status', 'pending')

  if ((activeCount || 0) >= MAX_ACTIVE_INVITES) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_ACTIVE_INVITES} active invites` },
      { status: 429 }
    )
  }

  const { data: invite, error } = await supabase
    .from('invites')
    .insert({ inviter_id: user.id })
    .select('invite_code, expires_at')
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  return NextResponse.json({ invite_code: invite.invite_code, expires_at: invite.expires_at })
}
