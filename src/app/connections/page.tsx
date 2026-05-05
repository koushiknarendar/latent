'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Connection = {
  room_id: string
  user_id: string
  full_name: string
  occupation: string | null
  connected_at: string
  intent: string | null
  is_nearby: boolean
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const fetchConnections = (lat?: number, lng?: number) => {
      const params = lat && lng ? `?lat=${lat}&lng=${lng}` : ''
      fetch(`/api/connections${params}`)
        .then(r => r.json())
        .then(data => {
          setConnections(data.connections || [])
          setLoading(false)
        })
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchConnections(pos.coords.latitude, pos.coords.longitude),
        () => fetchConnections(),
        { timeout: 5000 }
      )
    } else {
      fetchConnections()
    }
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const nearby = connections.filter(c => c.is_nearby)
  const others = connections.filter(c => !c.is_nearby)

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin" />
    </div>
  )

  return (
    <main className="min-h-screen bg-white px-6 py-8 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Connections</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {connections.length} {connections.length === 1 ? 'person' : 'people'} you've met
          </p>
        </div>
        <Link href="/radar" className="text-zinc-400 text-sm hover:text-zinc-600 transition-colors">
          ← Back
        </Link>
      </div>

      {connections.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-400 text-sm">No connections yet.</p>
          <p className="text-zinc-300 text-xs mt-1">People you mutually reveal with appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Nearby now */}
          {nearby.length > 0 && (
            <div className="space-y-2">
              <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium">Nearby now</p>
              {nearby.map(c => (
                <ConnectionCard key={c.room_id} connection={c} formatDate={formatDate} />
              ))}
            </div>
          )}

          {/* All others */}
          {others.length > 0 && (
            <div className="space-y-2">
              {nearby.length > 0 && (
                <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium">Past connections</p>
              )}
              {others.map(c => (
                <ConnectionCard key={c.room_id} connection={c} formatDate={formatDate} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}

function ConnectionCard({ connection: c, formatDate }: {
  connection: Connection
  formatDate: (iso: string) => string
}) {
  return (
    <div className="border border-zinc-100 rounded-2xl p-4 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-zinc-900 font-semibold text-sm">{c.full_name}</p>
            {c.is_nearby && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Nearby
              </span>
            )}
          </div>
          {c.occupation && (
            <p className="text-zinc-400 text-xs mt-0.5">{c.occupation}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <span className="text-zinc-300 text-xs">{formatDate(c.connected_at)}</span>
        {c.intent && (
          <>
            <span className="text-zinc-200 text-xs">·</span>
            <span className="text-zinc-300 text-xs capitalize">{c.intent}</span>
          </>
        )}
      </div>
    </div>
  )
}
