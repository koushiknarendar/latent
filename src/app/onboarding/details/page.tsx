'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Gender } from '@/types'

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Woman' },
  { value: 'male', label: 'Man' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
]

export default function DetailsPage() {
  const [form, setForm] = useState({ full_name: '', age: '', occupation: '', gender: '' as Gender | '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return toast.error('Name is required')
    if (!form.age || Number(form.age) < 18) return toast.error('Must be 18 or older')
    if (!form.gender) return toast.error('Select your gender')

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        age: Number(form.age),
        occupation: form.occupation.trim() || null,
        gender: form.gender,
      })
      .eq('id', user.id)

    setLoading(false)
    if (error) return toast.error('Failed to save. Try again.')
    router.push('/onboarding/intent')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Your details</h1>
        <p className="text-zinc-400 text-sm mt-1">Only revealed when you both agree. Hidden until then.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-zinc-400 text-xs uppercase tracking-wider font-medium">Full name</label>
          <Input
            placeholder="Priya Sharma"
            value={form.full_name}
            onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
            className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 h-12 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-zinc-400 text-xs uppercase tracking-wider font-medium">Age</label>
          <Input
            type="number"
            placeholder="26"
            min={18}
            max={99}
            value={form.age}
            onChange={(e) => setForm(f => ({ ...f, age: e.target.value }))}
            className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 h-12 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-zinc-400 text-xs uppercase tracking-wider font-medium">
            Occupation <span className="text-zinc-300 normal-case">(optional)</span>
          </label>
          <Input
            placeholder="Product Designer"
            value={form.occupation}
            onChange={(e) => setForm(f => ({ ...f, occupation: e.target.value }))}
            className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 h-12 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-zinc-400 text-xs uppercase tracking-wider font-medium">I am a</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setForm(f => ({ ...f, gender: value }))}
                className={`h-12 rounded-xl border text-sm font-medium transition-all ${
                  form.gender === value
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 bg-zinc-900 text-white rounded-full font-semibold hover:bg-zinc-800 disabled:opacity-40 transition-colors text-sm"
        >
          {loading ? 'Saving...' : 'Continue →'}
        </button>
        <div className="flex gap-1.5 justify-center">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === 0 ? 'w-6 bg-zinc-900' : 'w-2 bg-zinc-200'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
