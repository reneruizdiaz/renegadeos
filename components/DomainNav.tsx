'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/',                          symbol: '◈', label: 'Chief of Staff',    sub: 'Briefings & Synthesis'   },
  { href: '/agents/capital-markets',    symbol: '▲', label: 'Capital Markets',   sub: 'Avalon · BVPASA'         },
  { href: '/agents/newco',              symbol: '◆', label: 'Newco',             sub: 'Tokenization · July MVP' },
  { href: '/agents/sudestada',          symbol: '◆', label: 'Sudestada',         sub: 'Cross-border advisory'   },
  { href: '/agents/film',               symbol: '◐', label: 'Film & Creative',   sub: 'Maldecidos · Academia'   },
  { href: '/agents/media',              symbol: '◎', label: 'Media',             sub: 'Inteligencia Financiera' },
  { href: '/agents/research-personal',  symbol: '○', label: 'Research',          sub: 'PhD · Torga Archives'    },
]

export default function DomainNav() {
  const pathname = usePathname()

  return (
    <nav className="w-56 shrink-0 border-r border-[#1E1E21] bg-[#0A0A0B] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1E1E21]">
        <p className="text-[#C8920A] text-[10px] font-medium tracking-widest uppercase">
          Executive Intelligence
        </p>
        <p className="font-[family-name:var(--font-newsreader)] text-lg text-[#E8E6E1] mt-0.5">
          Renegade OS
        </p>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                active
                  ? 'bg-[#8B0000]/20 border-l-2 border-[#8B0000]'
                  : 'border-l-2 border-transparent hover:bg-[#111113]'
              }`}
            >
              <span
                className={`text-sm mt-0.5 shrink-0 ${
                  active ? 'text-[#8B0000]' : 'text-[#6B6868]'
                }`}
              >
                {item.symbol}
              </span>
              <span className="flex flex-col min-w-0">
                <span
                  className={`text-sm font-medium ${
                    active ? 'text-[#E8E6E1]' : 'text-[#A8A5A0]'
                  }`}
                >
                  {item.label}
                </span>
                <span className="text-[11px] text-[#6B6868] mt-0.5 truncate">
                  {item.sub}
                </span>
              </span>
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#1E1E21]">
        <p className="text-[10px] text-[#6B6868]">René Ruiz Díaz</p>
        <p className="text-[10px] text-[#6B6868]">Asunción, Paraguay</p>
      </div>
    </nav>
  )
}
