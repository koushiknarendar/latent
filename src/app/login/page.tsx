'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const sendOtp = async () => {
    if (!phone || phone.length < 10) return toast.error('Enter a valid phone number')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: phone.startsWith('+') ? phone : `+91${phone}`,
    })
    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success('OTP sent!')
    setStep('otp')
  }

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter the 6-digit OTP')
    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone.startsWith('+') ? phone : `+91${phone}`,
      token: otp,
      type: 'sms',
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
            {step === 'phone' ? 'Enter your phone number to continue' : `Enter the OTP sent to +91${phone}`}
          </p>
        </div>

        <div className="space-y-3">
          {step === 'phone' ? (
            <>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-500 text-sm font-medium">+91</span>
                <Input
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={10}
                  className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 h-12 rounded-xl"
                  onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                />
              </div>
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
              />
              <button
                onClick={verifyOtp}
                disabled={loading}
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 h-12 rounded-full font-semibold disabled:opacity-40 transition-colors text-sm"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                onClick={() => setStep('phone')}
                className="w-full text-zinc-400 text-sm hover:text-zinc-600 transition-colors"
              >
                ← Change number
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
