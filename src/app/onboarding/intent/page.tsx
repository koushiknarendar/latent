'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Intent } from '@/types'

const INTENTS: { value: Intent; label: string; description: string; emoji: string }[] = [
  { value: 'dating', label: 'Dating', description: 'Looking for a romantic connection', emoji: '✨' },
  { value: 'networking', label: 'Networking', description: 'Meet founders, builders, creators', emoji: '🤝' },
  { value: 'friends', label: 'New friends', description: 'Find people worth knowing', emoji: '👋' },
  { value: 'exploring', label: 'Just exploring', description: 'See who\'s around, no agenda', emoji: '🧭' },
  { value: 'open', label: 'Open to anything', description: 'Whatever happens, happens', emoji: '🌊' },
]

export default function IntentPage() {
  const [selected, setSelected] = useState<Intent | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!selected) return toast.error('Pick one to continue')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { error } = await supabase
      .from('profiles')
      .update({ intent: selected })
      .eq('id', user.id)

    setLoading(false)
    if (error) return toast.error('Failed to save. Try again.')
    router.push('/onboarding/interests')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">What brings you here?</h1>
        <p className="text-zinc-500 text-sm mt-1">You can change this before every session.</p>
      </div>

      <div className="space-y-2">
        {INTENTS.map(({ value, label, description, emoji }) => (
          <button
            key={value}
            onClick={() => setSelected(value)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
              selected === value
                ? 'border-white bg-zinc-900'
                : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
            }`}
          >
            <span className="text-2xl">{emoji}</span>
            <div>
              <p className={`font-semibold text-sm ${selected === value ? 'text-white' : 'text-zinc-300'}`}>{label}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{description}</p>
            </div>
            {selected === value && (
              <div className="ml-auto w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-black" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !selected}
          className="w-full h-12 bg-white text-black rounded-full font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : 'Continue →'}
        </button>
        <div className="flex gap-1 justify-center pt-1">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === 1 ? 'w-6 bg-white' : 'w-2 bg-zinc-700'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
