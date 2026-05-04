'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { INTEREST_CATEGORIES, PassionLevel } from '@/types'

type SelectedInterest = { category: string; subcategory: string; passion_level: PassionLevel }

const PASSION_LEVELS: { value: PassionLevel; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'passionate', label: 'Passionate' },
  { value: 'obsessed', label: 'Obsessed' },
]

export default function InterestsPage() {
  const [selected, setSelected] = useState<SelectedInterest[]>([])
  const [activeCategory, setActiveCategory] = useState<string>(Object.keys(INTEREST_CATEGORIES)[0])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const toggleInterest = (category: string, subcategory: string) => {
    const exists = selected.find(s => s.category === category && s.subcategory === subcategory)
    if (exists) {
      setSelected(prev => prev.filter(s => !(s.category === category && s.subcategory === subcategory)))
    } else {
      if (selected.length >= 10) return toast.error('Pick up to 10 interests')
      setSelected(prev => [...prev, { category, subcategory, passion_level: 'interested' }])
    }
  }

  const setPassion = (category: string, subcategory: string, passion_level: PassionLevel) => {
    setSelected(prev => prev.map(s =>
      s.category === category && s.subcategory === subcategory ? { ...s, passion_level } : s
    ))
  }

  const isSelected = (category: string, subcategory: string) =>
    selected.some(s => s.category === category && s.subcategory === subcategory)

  const getPassion = (category: string, subcategory: string): PassionLevel =>
    selected.find(s => s.category === category && s.subcategory === subcategory)?.passion_level || 'interested'

  const handleSubmit = async () => {
    if (selected.length < 3) return toast.error('Pick at least 3 interests')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    await supabase.from('user_interests').delete().eq('user_id', user.id)
    const { error } = await supabase.from('user_interests').insert(
      selected.map(s => ({ user_id: user.id, category: s.category, subcategory: s.subcategory, passion_level: s.passion_level }))
    )

    setLoading(false)
    if (error) return toast.error('Failed to save. Try again.')
    router.push('/onboarding/personality')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">What are you into?</h1>
        <p className="text-zinc-400 text-sm mt-1">Pick 3–10. Tell us how deep it goes.</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {Object.keys(INTEREST_CATEGORIES).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeCategory === cat
                ? 'bg-zinc-900 text-white'
                : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Interest chips */}
      <div className="flex flex-wrap gap-2">
        {INTEREST_CATEGORIES[activeCategory as keyof typeof INTEREST_CATEGORIES].map(sub => {
          const active = isSelected(activeCategory, sub)
          return (
            <button
              key={sub}
              onClick={() => toggleInterest(activeCategory, sub)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                active
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
              }`}
            >
              {sub}
            </button>
          )
        })}
      </div>

      {/* Selected interests with passion levels */}
      {selected.length > 0 && (
        <div className="space-y-2">
          <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium">Your picks ({selected.length}/10)</p>
          {selected.map(({ category, subcategory, passion_level }) => (
            <div key={`${category}-${subcategory}`} className="flex items-center gap-2 bg-zinc-50 border border-zinc-100 rounded-xl p-3">
              <span className="text-zinc-800 text-sm flex-1">{subcategory}</span>
              <div className="flex gap-1">
                {PASSION_LEVELS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setPassion(category, subcategory, value)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                      passion_level === value
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleSubmit}
          disabled={loading || selected.length < 3}
          className="w-full h-12 bg-zinc-900 text-white rounded-full font-semibold hover:bg-zinc-800 disabled:opacity-40 transition-colors text-sm"
        >
          {loading ? 'Saving...' : `Continue → (${selected.length} selected)`}
        </button>
        <div className="flex gap-1.5 justify-center">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === 2 ? 'w-6 bg-zinc-900' : 'w-2 bg-zinc-200'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
