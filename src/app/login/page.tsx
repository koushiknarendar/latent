'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const sendOtp = async () => {
    if (!email || !email.includes('@')) return toast.error('Enter a valid email address')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() })
    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success('Check your email for the OTP')
    setStep('otp')
  }

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter the 6-digit OTP')
    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: 'email',
    })
    setLoading(false)
    if (error) return toast.error(error.message)
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_onboarded, is_invite_verified')
        .eq('id', data.user.id)
        .single()

      if (!profile?.is_invite_verified) return router.push('/onboarding/invite')
      if (!profile?.is_onboarded) return router.push('/onboarding/details')
      router.push('/radar')
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center">
          <Link href="/" className="text-3xl font-bold text-zinc-900">latent</Link>
          <p className="mt-2 text-zinc-400 text-sm">
            {step === 'email' ? 'Enter your email to continue' : `Check ${email} for your OTP`}
          </p>
        </div>

        <div className="space-y-3">
          {step === 'email' ? (
            <>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 h-12 rounded-xl"
                onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                autoFocus
              />
              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 h-12 rounded-full font-semibold disabled:opacity-40 transition-colors text-sm"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <Input
                type="number"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 h-14 text-center text-2xl tracking-widest rounded-xl"
                onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
                autoFocus
              />
              <button
                onClick={verifyOtp}
                disabled={loading}
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 h-12 rounded-full font-semibold disabled:opacity-40 transition-colors text-sm"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                onClick={() => setStep('email')}
                className="w-full text-zinc-400 text-sm hover:text-zinc-600 transition-colors"
              >
                ← Change email
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-zinc-300">
          By continuing, you agree to our Terms of Service.<br />
          latent is invite-only.
        </p>
      </div>
    </main>
  )
}
