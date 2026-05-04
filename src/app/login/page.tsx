'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const sendLink = async () => {
    if (!email || !email.includes('@')) return toast.error('Enter a valid email address')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) return toast.error(error.message)
    setSent(true)
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center">
          <Link href="/" className="text-3xl font-bold text-zinc-900">latent</Link>
          <p className="mt-2 text-zinc-400 text-sm">
            {sent ? `Check ${email}` : 'Enter your email to continue'}
          </p>
        </div>

        {!sent ? (
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 h-12 rounded-xl"
              onKeyDown={(e) => e.key === 'Enter' && sendLink()}
              autoFocus
            />
            <button
              onClick={sendLink}
              disabled={loading}
              className="w-full bg-zinc-900 text-white hover:bg-zinc-800 h-12 rounded-full font-semibold disabled:opacity-40 transition-colors text-sm"
            >
              {loading ? 'Sending...' : 'Send sign-in link'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 text-center space-y-2">
              <p className="text-zinc-900 text-sm font-medium">Sign-in link sent</p>
              <p className="text-zinc-400 text-xs leading-relaxed">
                We sent a link to <span className="text-zinc-600">{email}</span>. Click it to sign in — no password needed.
              </p>
            </div>
            <button
              onClick={() => setSent(false)}
              className="w-full text-zinc-400 text-sm hover:text-zinc-600 transition-colors"
            >
              ← Use a different email
            </button>
          </div>
        )}

        <p className="text-center text-xs text-zinc-300">
          By continuing, you agree to our Terms of Service.<br />
          latent is invite-only.
        </p>
      </div>
    </main>
  )
}
