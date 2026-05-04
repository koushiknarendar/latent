'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Message, Room } from '@/types'

type RevealState = 'none' | 'requested-by-me' | 'requested-by-them' | 'revealed'

export default function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const [room, setRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [revealState, setRevealState] = useState<RevealState>('none')
  const [timeLeft, setTimeLeft] = useState('')
  const [showExtendPrompt, setShowExtendPrompt] = useState(false)
  const [otherUserName, setOtherUserName] = useState('')
  const [otherUserOccupation, setOtherUserOccupation] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m left`
  }

  const loadRoom = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    setUserId(user.id)

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single()

    if (!roomData) return router.push('/radar')
    if (roomData.user_1_id !== user.id && roomData.user_2_id !== user.id) return router.push('/radar')
    if (roomData.status === 'closed') return router.push('/radar')

    setRoom(roomData)

    const isUser1 = roomData.user_1_id === user.id
    const myRequested = isUser1 ? roomData.reveal_requested_by_1 : roomData.reveal_requested_by_2
    const theirRequested = isUser1 ? roomData.reveal_requested_by_2 : roomData.reveal_requested_by_1

    if (roomData.status === 'revealed') {
      setRevealState('revealed')
      const otherId = isUser1 ? roomData.user_2_id : roomData.user_1_id
      const { data: other } = await supabase.from('profiles').select('full_name, occupation').eq('id', otherId).single()
      if (other) {
        setOtherUserName(other.full_name || '')
        setOtherUserOccupation(other.occupation || '')
      }
    } else if (myRequested && theirRequested) {
      setRevealState('revealed')
    } else if (myRequested) {
      setRevealState('requested-by-me')
    } else if (theirRequested) {
      setRevealState('requested-by-them')
    }

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: true })

    setMessages(msgs || [])
  }, [id, supabase, router])

  useEffect(() => {
    loadRoom()
  }, [loadRoom])

  // Realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`room-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${id}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message])
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` },
        (payload) => {
          const updated = payload.new as Room
          setRoom(updated)
          if (updated.status === 'closed') router.push('/radar')
          if (updated.reveal_requested_by_1 && updated.reveal_requested_by_2) setRevealState('revealed')
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, supabase, router])

  // Timer
  useEffect(() => {
    if (!room) return
    const interval = setInterval(() => {
      const expires = new Date(room.timer_expires_at).getTime()
      const now = Date.now()
      const diff = expires - now
      if (diff <= 0) {
        setTimeLeft('Expired')
        clearInterval(interval)
        return
      }
      setTimeLeft(formatTime(diff))
      if (diff <= 2 * 60 * 60 * 1000 && !showExtendPrompt) setShowExtendPrompt(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [room, showExtendPrompt])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !userId) return
    const content = input.trim()
    setInput('')

    await supabase.from('messages').insert({ room_id: id, sender_id: userId, content })
  }

  const requestReveal = async () => {
    if (!userId || !room) return
    const isUser1 = room.user_1_id === userId
    await supabase.from('rooms').update(
      isUser1 ? { reveal_requested_by_1: true } : { reveal_requested_by_2: true }
    ).eq('id', id)
    setRevealState('requested-by-me')
    toast.success('Reveal request sent. Waiting for them...')
  }

  const acceptReveal = async () => {
    if (!userId || !room) return
    const isUser1 = room.user_1_id === userId
    await supabase.from('rooms').update({
      ...(isUser1 ? { reveal_requested_by_1: true } : { reveal_requested_by_2: true }),
      status: 'revealed',
    }).eq('id', id)
    setRevealState('revealed')

    const otherId = isUser1 ? room.user_2_id : room.user_1_id
    const { data: other } = await supabase.from('profiles').select('full_name, occupation').eq('id', otherId).single()
    if (other) {
      setOtherUserName(other.full_name || '')
      setOtherUserOccupation(other.occupation || '')
    }
    toast.success('Identity revealed!')
  }

  const closeRoom = async () => {
    await supabase.from('rooms').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', id)
    router.push('/radar')
  }

  const extendTimer = async () => {
    if (!room) return
    const newExpiry = new Date(room.timer_expires_at)
    newExpiry.setHours(newExpiry.getHours() + 24)
    await supabase.from('rooms').update({ timer_expires_at: newExpiry.toISOString(), timer_extended: true }).eq('id', id)
    setShowExtendPrompt(false)
    toast.success('24 more hours!')
  }

  if (!room) return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
        <div>
          <p className="text-white font-semibold text-sm">
            {revealState === 'revealed' ? otherUserName || 'Match' : 'Anonymous'}
          </p>
          {revealState === 'revealed' && otherUserOccupation && (
            <p className="text-zinc-500 text-xs">{otherUserOccupation}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {timeLeft && <span className="text-zinc-600 text-xs">{timeLeft}</span>}
          <button onClick={closeRoom} className="text-zinc-700 text-xs hover:text-red-400 transition-colors">Close</button>
        </div>
      </div>

      {/* Extend prompt */}
      {showExtendPrompt && (
        <div className="mx-4 mt-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
          <p className="text-zinc-300 text-sm">Conversation closes in 2 hours. Continue?</p>
          <div className="flex gap-2">
            <button onClick={() => setShowExtendPrompt(false)} className="text-zinc-600 text-xs">No</button>
            <button onClick={extendTimer} className="text-white text-xs font-medium">Yes +24h</button>
          </div>
        </div>
      )}

      {/* Reveal banner */}
      {revealState === 'requested-by-them' && (
        <div className="mx-4 mt-3 bg-zinc-900 border border-zinc-700 rounded-2xl p-4">
          <p className="text-white text-sm font-medium mb-3">They want to reveal 👀</p>
          <div className="flex gap-2">
            <button onClick={acceptReveal} className="flex-1 h-9 bg-white text-black rounded-full text-sm font-semibold">Reveal too</button>
            <button onClick={() => setRevealState('none')} className="flex-1 h-9 bg-zinc-800 text-zinc-300 rounded-full text-sm">Not yet</button>
          </div>
        </div>
      )}

      {revealState === 'revealed' && (
        <div className="mx-4 mt-3 bg-zinc-900 border border-zinc-700 rounded-2xl p-3 text-center">
          <p className="text-white text-sm">✓ Identities revealed — you know each other now</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Icebreaker */}
        {room.icebreaker && (
          <div className="flex justify-center my-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 max-w-xs text-center">
              <p className="text-zinc-400 text-xs mb-1">AI icebreaker</p>
              <p className="text-white text-sm italic">"{room.icebreaker}"</p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === userId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMe ? 'bg-white text-black rounded-br-sm' : 'bg-zinc-900 text-white rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reveal button */}
      {revealState === 'none' && messages.length >= 3 && (
        <div className="px-4 pb-2">
          <button
            onClick={requestReveal}
            className="w-full h-9 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-full text-sm hover:border-white hover:text-white transition-all"
          >
            ✨ Request reveal
          </button>
        </div>
      )}
      {revealState === 'requested-by-me' && (
        <div className="px-4 pb-2">
          <div className="w-full h-9 bg-zinc-900 border border-zinc-800 text-zinc-600 rounded-full text-sm flex items-center justify-center">
            Waiting for them to reveal...
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 pb-6 pt-2 border-t border-zinc-900">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Say something..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2.5 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-zinc-200 transition-colors flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
