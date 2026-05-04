import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-white">
      {/* Logo */}
      <div className="mb-14">
        <h1 className="text-6xl font-bold tracking-tight text-zinc-900">latent</h1>
        <p className="mt-3 text-zinc-400 text-base">The connection was already there.</p>
      </div>

      {/* Radar animation */}
      <div className="relative w-44 h-44 mb-14">
        <div className="absolute inset-0 rounded-full border border-zinc-200 animate-ping opacity-60" />
        <div className="absolute inset-4 rounded-full border border-zinc-300 animate-ping opacity-70" style={{ animationDelay: '0.5s' }} />
        <div className="absolute inset-8 rounded-full border border-zinc-400 animate-ping opacity-80" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-zinc-900" />
        </div>
        <div className="absolute top-5 right-7 w-2 h-2 rounded-full bg-zinc-300 animate-pulse" />
        <div className="absolute bottom-7 left-5 w-2 h-2 rounded-full bg-zinc-300 animate-pulse" style={{ animationDelay: '0.7s' }} />
        <div className="absolute top-1/2 right-3 w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" style={{ animationDelay: '1.2s' }} />
      </div>

      {/* Value props */}
      <div className="max-w-xs space-y-4 mb-12 text-left">
        {[
          ['Someone interesting is within 500m of you right now.'],
          ["You're both anonymous. Until you're not."],
          ['AI finds your match. You have 24 hours.'],
        ].map(([text]) => (
          <div key={text} className="flex gap-3 items-start">
            <div className="w-1 h-1 rounded-full bg-zinc-300 mt-2 flex-shrink-0" />
            <p className="text-zinc-500 text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="w-full max-w-xs space-y-3">
        <Link
          href="/login"
          className="flex items-center justify-center w-full bg-zinc-900 text-white hover:bg-zinc-800 font-semibold h-12 rounded-full transition-colors text-sm"
        >
          Get started
        </Link>
        <p className="text-xs text-zinc-400 text-center">
          Invite-only · You need a code from someone already here
        </p>
      </div>
    </main>
  )
}
