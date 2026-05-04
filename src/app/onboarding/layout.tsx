export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <span className="text-zinc-900 font-bold text-lg">latent</span>
        <span className="text-zinc-400 text-xs">Setup profile</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
