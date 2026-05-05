'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const SIGNALS = [
  { key: 'respectful', label: 'They were respectful' },
  { key: 'interesting', label: 'Great conversation' },
  { key: 'would_recommend', label: "I'd recommend them" },
] as const

type Signal = typeof SIGNALS[number]['key']

export default function RecommendPage() {
  const { id } = useParams<{ id: string }>()
  const [ratedUserId, setRatedUserId] = useState<string | null>(null)
  const [picks, setPicks] = useState<Record<Signal, boolean | null>>({
    respectful: null,
    interesting: null,
    would_recommend: null,
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: room } = await supabase
      .from('rooms')
      .select('user_1_id, user_2_id, status')
      .eq('id', id)
      .single()

    if (!room) return router.push('/radar')
    if (room.user_1_id !== user.id && room.user_2_id !== user.id) return router.push('/radar')

    // Check if already recommended
    const { data: existing } = await supabase
      .from('ratings')
      .select('id')
      .eq('room_id', id)
      .eq('rater_id', user.id)
      .single()

    if (existing) return router.push('/radar')

    setRatedUserId(room.user_1_id === user.id ? room.user_2_id : room.user_1_id)
    setLoading(false)
  }, [id, supabase, router])

  useEffect(() => { load() }, [load])

  const toggle = (key: Signal, value: boolean) => {
    setPicks(prev => ({ ...prev, [key]: prev[key] === value ? null : value }))
  }

  const submit = async () => {
    if (!ratedUserId) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { error } = await supabase.from('ratings').insert({
      room_id: id,
      rater_id: user.id,
      rated_user_id: ratedUserId,
      respectful: picks.respectful,
      interesting: picks.interesting,
      would_recommend: picks.would_recommend,
    })

    setSubmitting(false)
    if (error) return toast.error('Failed to submit. Try again.')
    toast.success('Recommendation sent')
    router.push('/radar')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
    </div>
  )

  const hasAnyPick = Object.values(picks).some(v => v !== null)

  return (
    <div className="flex flex-col min-h-screen bg-black px-6 py-10">
      <div className="space-y-2 mb-10">
        <h1 className="text-white text-2xl font-bold">Would you recommend them?</h1>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Anonymous. Helps build trust on latent. They'll see it after 24 hours.
        </p>
      </div>

      <div className="space-y-3 mb-10">
        {SIGNALS.map(({ key, label }) => (
          <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-white text-sm font-medium mb-3">{label}</p>
            <div className="flex gap-2">
              {[{ value: true, label: 'Yes' }, { value: false, label: 'No' }].map(({ value, label: btnLabel }) => (
                <button
                  key={String(value)}
                  onClick={() => toggle(key, value)}
                  className={`flex-1 h-9 rounded-full text-sm font-medium transition-all ${
                    picks[key] === value
                      ? value ? 'bg-white text-black' : 'bg-zinc-700 text-white'
                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                  }`}
                >
                  {btnLabel}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button
          onClick={submit}
          disabled={submitting || !hasAnyPick}
          className="w-full h-12 bg-white text-black rounded-full font-semibold hover:bg-zinc-200 disabled:opacity-40 transition-colors text-sm"
        >
          {submitting ? 'Sending...' : 'Send recommendation'}
        </button>
        <button
          onClick={() => router.push('/radar')}
          className="w-full text-zinc-600 text-sm hover:text-zinc-400 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
