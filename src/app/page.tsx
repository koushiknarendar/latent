import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-black">
      {/* Logo */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold tracking-tight text-white">latent</h1>
        <p className="mt-3 text-zinc-400 text-lg">The connection was already there.</p>
      </div>

      {/* Radar animation */}
      <div className="relative w-48 h-48 mb-16">
        <div className="absolute inset-0 rounded-full border border-zinc-800 animate-ping opacity-20" />
        <div className="absolute inset-4 rounded-full border border-zinc-700 animate-ping opacity-30" style={{ animationDelay: '0.5s' }} />
        <div className="absolute inset-8 rounded-full border border-zinc-600 animate-ping opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-white" />
        </div>
        <div className="absolute top-6 right-8 w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
        <div className="absolute bottom-8 left-6 w-2 h-2 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: '0.7s' }} />
        <div className="absolute top-1/2 right-4 w-2 h-2 rounded-full bg-zinc-400 animate-pulse" style={{ animationDelay: '1.2s' }} />
      </div>

      {/* Value props */}
      <div className="max-w-xs space-y-4 mb-12 text-left">
        {[
          ['📍', 'Someone interesting is within 500m of you right now.'],
          ['🎭', "You're both anonymous. Until you're not."],
          ['⚡', 'AI finds your match. You have 24 hours.'],
        ].map(([icon, text]) => (
          <div key={text as string} className="flex gap-3 items-start">
            <span className="text-lg">{icon}</span>
            <p className="text-zinc-400 text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="w-full max-w-xs space-y-3">
        <Link
          href="/login"
          className="flex items-center justify-center w-full bg-white text-black hover:bg-zinc-200 font-semibold h-12 rounded-full transition-colors"
        >
          Get started
        </Link>
        <p className="text-xs text-zinc-600 text-center">
          Free for women · Men join by invite + subscription
        </p>
      </div>
    </main>
  )
}
