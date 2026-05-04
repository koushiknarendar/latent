'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'

type Invite = {
  id: string
  invite_code: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
  created_at: string
}

const MAX_INVITES = 3

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const loadInvites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_onboarded, is_invite_verified')
      .eq('id', user.id)
      .single()

    if (!profile?.is_invite_verified) return router.push('/onboarding/invite')
    if (!profile?.is_onboarded) return router.push('/onboarding/details')

    const { data } = await supabase
      .from('invites')
      .select('id, invite_code, status, expires_at, created_at')
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false })

    setInvites((data || []) as Invite[])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    loadInvites()
  }, [loadInvites])

  const generateInvite = async () => {
    const pendingCount = invites.filter(i => i.status === 'pending').length
    if (pendingCount >= MAX_INVITES) {
      return toast.error(`You can have at most ${MAX_INVITES} active invites`)
    }

    setGenerating(true)
    const res = await fetch('/api/invite/generate', { method: 'POST' })
    const data = await res.json()
    setGenerating(false)

    if (!res.ok) return toast.error(data.error || 'Failed to generate invite')

    toast.success('Invite code created!')
    loadInvites()
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied!')
  }

  const shareCode = (code: string) => {
    const url = `${window.location.origin}/join/${code}`
    if (navigator.share) {
      navigator.share({ title: 'Join me on latent', text: 'Use my invite to join latent', url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    }
  }

  const pendingCount = invites.filter(i => i.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-5 h-5 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Your invites</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{pendingCount}/{MAX_INVITES} active</p>
        </div>
        <Link href="/radar" className="text-zinc-400 text-sm hover:text-zinc-600 transition-colors">
          ← Back
        </Link>
      </div>

      {/* Generate button */}
      <button
        onClick={generateInvite}
        disabled={generating || pendingCount >= MAX_INVITES}
        className="w-full h-12 bg-zinc-900 text-white rounded-full font-semibold hover:bg-zinc-800 disabled:opacity-40 transition-colors text-sm mb-6"
      >
        {generating ? 'Generating...' : pendingCount >= MAX_INVITES ? 'All slots used' : '+ Generate invite code'}
      </button>

      {/* Invite list */}
      {invites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400 text-sm">No invites yet. Generate one to invite a man you'd like on latent.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className={`border rounded-2xl p-4 ${
                invite.status === 'accepted'
                  ? 'border-zinc-100 bg-zinc-50'
                  : invite.status === 'expired'
                  ? 'border-zinc-100 bg-zinc-50 opacity-50'
                  : 'border-zinc-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-sm font-medium text-zinc-900 tracking-wider">
                  {invite.invite_code}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  invite.status === 'accepted'
                    ? 'bg-zinc-900 text-white'
                    : invite.status === 'expired'
                    ? 'bg-zinc-100 text-zinc-400'
                    : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {invite.status === 'accepted' ? 'Used' : invite.status === 'expired' ? 'Expired' : 'Pending'}
                </span>
              </div>

              {invite.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => copyCode(invite.invite_code)}
                    className="flex-1 h-9 bg-zinc-100 text-zinc-600 rounded-full text-xs font-medium hover:bg-zinc-200 transition-colors"
                  >
                    Copy code
                  </button>
                  <button
                    onClick={() => shareCode(invite.invite_code)}
                    className="flex-1 h-9 bg-zinc-900 text-white rounded-full text-xs font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Share link
                  </button>
                </div>
              )}

              {invite.status === 'accepted' && (
                <p className="text-zinc-400 text-xs">Someone joined using this code</p>
              )}

              <p className="text-zinc-300 text-xs mt-2">
                Expires {new Date(invite.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
        <p className="text-zinc-400 text-xs leading-relaxed">
          Each code can be used once and expires in 30 days. Share it directly with someone you'd want on latent — they'll need it to create an account.
        </p>
      </div>
    </main>
  )
}
