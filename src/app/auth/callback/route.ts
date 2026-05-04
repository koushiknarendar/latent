import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_onboarded, is_invite_verified')
        .eq('id', user.id)
        .single()

      if (!profile?.is_invite_verified) return NextResponse.redirect(`${origin}/onboarding/invite`)
      if (!profile?.is_onboarded) return NextResponse.redirect(`${origin}/onboarding/details`)
      return NextResponse.redirect(`${origin}/radar`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
