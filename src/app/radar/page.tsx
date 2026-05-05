'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'

type RadarState = 'idle' | 'scanning' | 'found' | 'matching' | 'no-match'

export default function RadarPage() {
  const [state, setState] = useState<RadarState>('idle')
  const [nearbyCount, setNearbyCount] = useState(0)
  const [userName, setUserName] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, is_onboarded, is_invite_verified')
        .eq('id', user.id)
        .single()

      if (!profile?.is_invite_verified) return router.push('/onboarding/invite')
      if (!profile?.is_onboarded) return router.push('/onboarding/details')
      setUserName(profile.full_name?.split(' ')[0] || '')
    }
    loadUser()
  }, [supabase, router])

  const startScanning = useCallback(() => {
    setState('scanning')

    if (!navigator.geolocation) {
      toast.error('Location access needed to find nearby people')
      setState('idle')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setLocation({ lat, lng })

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Update user location
        await supabase
          .from('profiles')
          .update({ current_lat: lat, current_lng: lng, last_location_update: new Date().toISOString() })
          .eq('id', user.id)

        // Simulate finding nearby users (replace with real proximity query)
        setTimeout(() => {
          const count = Math.floor(Math.random() * 5) + 1
          setNearbyCount(count)
          setState('found')
        }, 2000)
      },
      () => {
        toast.error('Please allow location access and try again')
        setState('idle')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [supabase])

  const findMatch = async () => {
    setState('matching')

    const res = await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: location?.lat, lng: location?.lng }),
    })

    if (!res.ok) {
      setState('no-match')
      return
    }

    const { room_id } = await res.json()
    router.push(`/room/${room_id}`)
  }

  return (
    <main className="flex flex-col min-h-screen bg-black px-6">
      {/* Header */}
      <div className="flex items-center justify-between py-5">
        <span className="text-white font-bold text-xl">latent</span>
        <div className="flex items-center gap-3">
          {userName && <span className="text-zinc-500 text-sm">{userName}</span>}
          <Link href="/connections" className="text-zinc-500 text-xs hover:text-zinc-300 transition-colors">
            Connections
          </Link>
          <Link href="/invites" className="text-zinc-500 text-xs hover:text-zinc-300 transition-colors">
            Invites
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/')
            }}
            className="text-zinc-700 text-xs hover:text-zinc-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main radar area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">

        {/* Radar visual */}
        <div className="relative w-56 h-56">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`absolute inset-${i * 4} rounded-full border transition-all duration-1000 ${
                state === 'scanning'
                  ? 'border-zinc-600 animate-ping'
                  : state === 'found' || state === 'matching'
                  ? 'border-zinc-500'
                  : 'border-zinc-800'
              }`}
              style={{ animationDelay: `${i * 0.4}s`, animationDuration: '2s' }}
            />
          ))}

          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`rounded-full transition-all duration-500 ${
              state === 'scanning' ? 'w-4 h-4 bg-white animate-pulse' :
              state === 'found' ? 'w-4 h-4 bg-white' :
              state === 'matching' ? 'w-5 h-5 bg-white animate-ping' :
              'w-3 h-3 bg-zinc-600'
            }`} />
          </div>

          {/* Nearby dots */}
          {(state === 'found' || state === 'matching') && (
            <>
              <div className="absolute top-8 right-10 w-2.5 h-2.5 rounded-full bg-zinc-400 animate-pulse" />
              <div className="absolute bottom-10 left-8 w-2 h-2 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
              {nearbyCount > 2 && <div className="absolute top-1/2 right-6 w-2 h-2 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: '1s' }} />}
            </>
          )}
        </div>

        {/* State text */}
        <div className="text-center space-y-2">
          {state === 'idle' && (
            <>
              <p className="text-white text-lg font-semibold">Ready to discover?</p>
              <p className="text-zinc-500 text-sm">Tap to find interesting people nearby</p>
            </>
          )}
          {state === 'scanning' && (
            <>
              <p className="text-white text-lg font-semibold">Scanning nearby...</p>
              <p className="text-zinc-500 text-sm">Looking within 500 metres</p>
            </>
          )}
          {state === 'found' && (
            <>
              <p className="text-white text-lg font-semibold">
                {nearbyCount} interesting {nearbyCount === 1 ? 'person' : 'people'} nearby
              </p>
              <p className="text-zinc-500 text-sm">Tap to find your best match</p>
            </>
          )}
          {state === 'matching' && (
            <>
              <p className="text-white text-lg font-semibold">Finding your match...</p>
              <p className="text-zinc-500 text-sm">AI is reading interests and finding the right person</p>
            </>
          )}
          {state === 'no-match' && (
            <>
              <p className="text-white text-lg font-semibold">No matches right now</p>
              <p className="text-zinc-500 text-sm">Come back when more people are around</p>
            </>
          )}
        </div>

        {/* CTA Button */}
        {state === 'idle' && (
          <button
            onClick={startScanning}
            className="w-full max-w-xs h-14 bg-white text-black rounded-full font-bold text-base hover:bg-zinc-200 transition-colors"
          >
            Scan nearby
          </button>
        )}
        {state === 'found' && (
          <button
            onClick={findMatch}
            className="w-full max-w-xs h-14 bg-white text-black rounded-full font-bold text-base hover:bg-zinc-200 transition-colors"
          >
            Find my match →
          </button>
        )}
        {state === 'no-match' && (
          <button
            onClick={() => setState('idle')}
            className="w-full max-w-xs h-12 bg-zinc-900 text-zinc-300 rounded-full font-medium text-sm border border-zinc-800 hover:border-zinc-600 transition-colors"
          >
            Try again
          </button>
        )}
      </div>

      {/* Bottom hint */}
      <div className="py-6 text-center">
        <p className="text-zinc-700 text-xs">You're anonymous until you both choose to reveal</p>
      </div>
    </main>
  )
}
