'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const EXTENSIONS = [
  { label: '+1 hour', hours: 1, price: 99 },
  { label: '+3 hours', hours: 3, price: 199 },
  { label: '+24 hours', hours: 24, price: 499 },
]

export default function ExtendPage() {
  const { id } = useParams<{ id: string }>()
  const [alreadyExtended, setAlreadyExtended] = useState(false)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const checkRoom = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: room } = await supabase
      .from('rooms')
      .select('timer_expires_at, timer_extended, status, user_1_id, user_2_id')
      .eq('id', id)
      .single()

    if (!room || room.status === 'closed') return router.push('/radar')
    if (room.user_1_id !== user.id && room.user_2_id !== user.id) return router.push('/radar')

    const minsLeft = (new Date(room.timer_expires_at).getTime() - Date.now()) / 60000
    setAlreadyExtended(minsLeft > 15)
    setLoading(false)
  }, [id, supabase, router])

  useEffect(() => {
    checkRoom()
  }, [checkRoom])

  const handleExtend = async (hours: number, price: number) => {
    setPaying(true)
    // Cashfree integration goes here
    // For now: validate room isn't already extended then show coming soon
    const { data: room } = await supabase
      .from('rooms')
      .select('timer_expires_at')
      .eq('id', id)
      .single()

    if (room) {
      const minsLeft = (new Date(room.timer_expires_at).getTime() - Date.now()) / 60000
      if (minsLeft > 15) {
        setPaying(false)
        setAlreadyExtended(true)
        return toast.error('Session was already extended')
      }
    }

    setPaying(false)
    toast('Payment coming soon', {
      description: `Cashfree integration in progress. ₹${price} for ${hours}h extension.`,
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-black px-6 py-8">
      <button
        onClick={() => router.back()}
        className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors mb-8 text-left"
      >
        ← Back to conversation
      </button>

      <div className="space-y-2 mb-8">
        <h1 className="text-white text-xl font-bold">Extend session</h1>
        <p className="text-zinc-500 text-sm">Either of you can pay — both stay in the conversation.</p>
      </div>

      {alreadyExtended ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <p className="text-white text-sm font-medium">Session already extended</p>
          <p className="text-zinc-500 text-xs mt-1">You have more than 15 minutes left.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 w-full h-10 bg-zinc-800 text-zinc-300 rounded-full text-sm hover:bg-zinc-700 transition-colors"
          >
            Back to conversation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {EXTENSIONS.map(({ label, hours, price }) => (
            <button
              key={hours}
              onClick={() => handleExtend(hours, price)}
              disabled={paying}
              className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl px-5 py-4 transition-all disabled:opacity-50"
            >
              <div className="text-left">
                <p className="text-white font-semibold text-sm">{label}</p>
              </div>
              <span className="text-zinc-300 text-sm font-medium">₹{price}</span>
            </button>
          ))}

          <p className="text-zinc-700 text-xs text-center pt-2">
            The other person won't see the amount — just that the session was extended.
          </p>
        </div>
      )}
    </div>
  )
}
