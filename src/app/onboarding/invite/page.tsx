'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function InvitePage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    const trimmed = code.trim().toLowerCase()
    if (!trimmed) return toast.error('Enter your invite code')
    setLoading(true)

    const res = await fetch('/api/invite/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmed }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) return toast.error(data.error || 'Invalid code')

    toast.success('Welcome to latent.')

    // Check if they still need to complete onboarding
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_onboarded')
      .eq('id', user.id)
      .single()

    router.push(profile?.is_onboarded ? '/radar' : '/onboarding/details')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">You need an invite</h1>
        <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
          latent is invite-only. Get a code from someone already on the platform.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-zinc-400 text-xs uppercase tracking-wider font-medium">Invite code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. a3f9c12b"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-300 text-sm font-mono focus:outline-none focus:border-zinc-400 transition-colors h-12"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
          className="w-full h-12 bg-zinc-900 text-white rounded-full font-semibold hover:bg-zinc-800 disabled:opacity-40 transition-colors text-sm"
        >
          {loading ? 'Checking...' : 'Enter latent →'}
        </button>
      </div>

      <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 space-y-2">
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Why invite-only?</p>
        <p className="text-zinc-400 text-xs leading-relaxed">
          Everyone on latent was brought in by someone who's already here. It keeps the community worth being a part of.
        </p>
      </div>
    </div>
  )
}
