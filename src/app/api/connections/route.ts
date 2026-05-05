import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PROXIMITY_METRES = 500
const DEGREES_PER_METRE = 1 / 111000
const LOCATION_STALE_MINS = 30

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '')
  const lng = parseFloat(searchParams.get('lng') || '')
  const hasLocation = !isNaN(lat) && !isNaN(lng)

  // Get all revealed rooms the user was part of
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, user_1_id, user_2_id, created_at, session_intent')
    .eq('status', 'revealed')
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (!rooms || rooms.length === 0) return NextResponse.json({ connections: [] })

  const otherIds = rooms.map(r => r.user_1_id === user.id ? r.user_2_id : r.user_1_id)

  // Fetch other users' profiles (service role bypasses RLS)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, occupation, current_lat, current_lng, last_location_update')
    .in('id', otherIds)

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

  const delta = PROXIMITY_METRES * DEGREES_PER_METRE
  const staleThreshold = new Date(Date.now() - LOCATION_STALE_MINS * 60 * 1000)

  const connections = rooms.map(room => {
    const otherId = room.user_1_id === user.id ? room.user_2_id : room.user_1_id
    const profile = profileMap[otherId]

    let isNearby = false
    if (hasLocation && profile?.current_lat && profile?.current_lng) {
      const locationFresh = new Date(profile.last_location_update) > staleThreshold
      const withinBounds =
        Math.abs(profile.current_lat - lat) <= delta &&
        Math.abs(profile.current_lng - lng) <= delta
      isNearby = locationFresh && withinBounds
    }

    return {
      room_id: room.id,
      user_id: otherId,
      full_name: profile?.full_name || 'Unknown',
      occupation: profile?.occupation || null,
      connected_at: room.created_at,
      intent: room.session_intent,
      is_nearby: isNearby,
    }
  })

  return NextResponse.json({ connections })
}
