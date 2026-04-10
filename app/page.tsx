export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Logo / Title */}
        <div className="space-y-2">
          <p className="text-[#C8920A] text-sm font-medium tracking-widest uppercase">
            Executive Intelligence
          </p>
          <h1 className="font-[family-name:var(--font-newsreader)] text-5xl font-normal text-[#E8E6E1] leading-tight">
            Renegade OS
          </h1>
          <p className="text-[#6B6868] text-base">
            Seven agents. One operating system.
          </p>
        </div>

        {/* Domain grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'Capital Markets', sub: 'Avalon · BVPASA' },
            { label: 'Newco', sub: 'Tokenization · July MVP' },
            { label: 'Sudestada', sub: 'Cross-border advisory' },
            { label: 'Film & Creative', sub: 'Maldecidos · Academia' },
            { label: 'Media', sub: 'Inteligencia Financiera' },
            { label: 'Research', sub: 'PhD · Torga Archives' },
          ].map((d) => (
            <div
              key={d.label}
              className="rounded border border-[#1E1E21] bg-[#111113] px-4 py-3 space-y-1"
            >
              <p className="text-sm font-medium text-[#E8E6E1]">{d.label}</p>
              <p className="text-xs text-[#6B6868]">{d.sub}</p>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#C8920A]" />
          <p className="text-xs text-[#6B6868]">
            Day 1 scaffold — agents coming Day 2
          </p>
        </div>
      </div>
    </main>
  )
}
