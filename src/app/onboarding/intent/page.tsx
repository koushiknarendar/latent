'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Intent } from '@/types'

const INTENTS: { value: Intent; label: string; description: string }[] = [
  { value: 'dating', label: 'Dating', description: 'Looking for a romantic connection' },
  { value: 'networking', label: 'Networking', description: 'Meet founders, builders, creators' },
  { value: 'friends', label: 'New friends', description: 'Find people worth knowing' },
  { value: 'exploring', label: 'Just exploring', description: "See who's around, no agenda" },
  { value: 'open', label: 'Open to anything', description: 'Whatever happens, happens' },
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
        <h1 className="text-2xl font-bold text-zinc-900">What brings you here?</h1>
        <p className="text-zinc-400 text-sm mt-1">You can change this before every session.</p>
      </div>

      <div className="space-y-2">
        {INTENTS.map(({ value, label, description }) => (
          <button
            key={value}
            onClick={() => setSelected(value)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
              selected === value
                ? 'border-zinc-900 bg-zinc-900'
                : 'border-zinc-200 bg-white hover:border-zinc-400'
            }`}
          >
            <div className="flex-1">
              <p className={`font-semibold text-sm ${selected === value ? 'text-white' : 'text-zinc-800'}`}>{label}</p>
              <p className={`text-xs mt-0.5 ${selected === value ? 'text-zinc-400' : 'text-zinc-400'}`}>{description}</p>
            </div>
            {selected === value && (
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <button
          onClick={handleSubmit}
          disabled={loading || !selected}
          className="w-full h-12 bg-zinc-900 text-white rounded-full font-semibold hover:bg-zinc-800 disabled:opacity-40 transition-colors text-sm"
        >
          {loading ? 'Saving...' : 'Continue →'}
        </button>
        <div className="flex gap-1.5 justify-center">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === 1 ? 'w-6 bg-zinc-900' : 'w-2 bg-zinc-200'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
