'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { PERSONALITY_QUESTIONS } from '@/types'

export default function PersonalityPage() {
  const [answers, setAnswers] = useState(['', '', ''])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    if (answers.some(a => a.trim().length < 10)) return toast.error('Answer each question (at least a few words)')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    // Save responses first
    const { error: responseError } = await supabase
      .from('personality_responses')
      .upsert({
        user_id: user.id,
        question_1: answers[0].trim(),
        question_2: answers[1].trim(),
        question_3: answers[2].trim(),
      })

    if (responseError) {
      setLoading(false)
      return toast.error('Failed to save. Try again.')
    }

    // Extract personality vector via API route
    const res = await fetch('/api/personality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })

    if (res.ok) {
      const { vector } = await res.json()
      await supabase
        .from('personality_responses')
        .update({ ai_personality_vector: vector })
        .eq('user_id', user.id)
    }

    // Mark onboarding complete
    await supabase
      .from('profiles')
      .update({ is_onboarded: true })
      .eq('id', user.id)

    setLoading(false)
    toast.success("You're all set!")
    router.push('/radar')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Tell us a bit more</h1>
        <p className="text-zinc-500 text-sm mt-1">AI uses these to find your best match. Never shown to others.</p>
      </div>

      <div className="space-y-6">
        {PERSONALITY_QUESTIONS.map((question, i) => (
          <div key={i} className="space-y-2">
            <label className="text-zinc-300 text-sm font-medium leading-relaxed block">
              {i + 1}. {question}
            </label>
            <textarea
              value={answers[i]}
              onChange={(e) => setAnswers(prev => prev.map((a, idx) => idx === i ? e.target.value : a))}
              rows={3}
              placeholder="Write freely..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white placeholder:text-zinc-600 text-sm resize-none focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <button
          onClick={handleSubmit}
          disabled={loading || answers.some(a => a.trim().length < 10)}
          className="w-full h-12 bg-white text-black rounded-full font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Analysing...' : 'Find my people →'}
        </button>
        <div className="flex gap-1 justify-center pt-1">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === 3 ? 'w-6 bg-white' : 'w-2 bg-zinc-700'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
