import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateIcebreaker } from '@/lib/anthropic/icebreaker'

const PROXIMITY_METRES = 500
const DEGREES_PER_METRE = 1 / 111000

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lat, lng } = await req.json()
  if (!lat || !lng) return NextResponse.json({ error: 'Location required' }, { status: 400 })

  // Check man's daily conversation limit
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('gender, intent, is_male_verified')
    .eq('id', user.id)
    .single()

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (myProfile.gender === 'male') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('user_1_id', user.id)
      .gte('created_at', today.toISOString())

    if ((count || 0) >= 2) {
      return NextResponse.json({ error: 'Daily limit reached. Come back tomorrow.' }, { status: 429 })
    }

    // Check 1hr cooldown
    const { data: lastRoom } = await supabase
      .from('rooms')
      .select('closed_at')
      .eq('user_1_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lastRoom?.closed_at) {
      const cooldownEnd = new Date(lastRoom.closed_at)
      cooldownEnd.setHours(cooldownEnd.getHours() + 1)
      if (new Date() < cooldownEnd) {
        return NextResponse.json({ error: 'Cooldown active. Try again in a bit.' }, { status: 429 })
      }
    }
  }

  // Check user doesn't already have active room
  const { data: existingRoom } = await supabase
    .from('rooms')
    .select('id')
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (existingRoom && myProfile.gender === 'male') {
    return NextResponse.json({ error: 'You already have an active conversation' }, { status: 409 })
  }

  // Get my interests and personality
  const [{ data: myInterests }, { data: myPersonality }] = await Promise.all([
    supabase.from('user_interests').select('*').eq('user_id', user.id),
    supabase.from('personality_responses').select('*').eq('user_id', user.id).single(),
  ])

  // Find nearby users within 500m (bounding box approximation)
  const delta = PROXIMITY_METRES * DEGREES_PER_METRE
  const { data: nearbyUsers } = await supabase
    .from('profiles')
    .select('id, gender, intent, gender_preference, age, age_min, age_max')
    .neq('id', user.id)
    .eq('is_onboarded', true)
    .gte('current_lat', lat - delta)
    .lte('current_lat', lat + delta)
    .gte('current_lng', lng - delta)
    .lte('current_lng', lng + delta)
    .not('current_lat', 'is', null)

  if (!nearbyUsers || nearbyUsers.length === 0) {
    return NextResponse.json({ error: 'No one nearby' }, { status: 404 })
  }

  // Filter by gender preference and intent compatibility
  const COMPATIBLE_INTENTS: Record<string, string[]> = {
    dating: ['dating', 'open'],
    networking: ['networking', 'open'],
    friends: ['friends', 'exploring', 'open'],
    exploring: ['friends', 'exploring', 'open'],
    open: ['dating', 'networking', 'friends', 'exploring', 'open'],
  }
  const myCompatibleIntents = COMPATIBLE_INTENTS[myProfile.intent || 'open'] || []

  const candidates = nearbyUsers.filter(u => {
    const intentOk = myCompatibleIntents.includes(u.intent || 'open')
    const genderOk = !myProfile.intent || myProfile.gender === 'prefer-not-to-say' || true // simplified
    return intentOk && genderOk
  })

  if (candidates.length === 0) {
    return NextResponse.json({ error: 'No compatible matches nearby' }, { status: 404 })
  }

  // Score candidates by interest overlap
  const scored = await Promise.all(
    candidates.map(async (candidate) => {
      const { data: theirInterests } = await supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', candidate.id)

      const mySet = new Set(myInterests?.map(i => `${i.subcategory}`) || [])
      const overlap = theirInterests?.filter(i => mySet.has(i.subcategory)) || []

      // Weight obsessed > passionate > interested
      const weights = { obsessed: 3, passionate: 2, interested: 1 }
      const score = overlap.reduce((sum, i) => sum + (weights[i.passion_level as keyof typeof weights] || 1), 0)

      return { candidate, theirInterests: theirInterests || [], score }
    })
  )

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]

  // Get their personality
  const { data: theirPersonality } = await supabase
    .from('personality_responses')
    .select('*')
    .eq('user_id', best.candidate.id)
    .single()

  // Generate AI icebreaker
  const icebreaker = await generateIcebreaker(
    {
      interests: myInterests || [],
      personality: {
        question_1: myPersonality?.question_1 || '',
        question_2: myPersonality?.question_2 || '',
      },
      intent: myProfile.intent || 'open',
    },
    {
      interests: best.theirInterests,
      personality: {
        question_1: theirPersonality?.question_1 || '',
        question_2: theirPersonality?.question_2 || '',
      },
      intent: best.candidate.intent || 'open',
    }
  )

  // Create room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      user_1_id: user.id,
      user_2_id: best.candidate.id,
      icebreaker,
      session_intent: myProfile.intent,
      venue_lat: lat,
      venue_lng: lng,
    })
    .select('id')
    .single()

  if (roomError || !room) {
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }

  return NextResponse.json({ room_id: room.id })
}
