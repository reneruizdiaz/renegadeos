'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/'

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push(from)
      router.refresh()
    } else {
      setError('Invalid password.')
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen px-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1">
          <p className="text-[#C8920A] text-xs tracking-widest uppercase">
            Renegade OS
          </p>
          <h1 className="font-[family-name:var(--font-newsreader)] text-3xl text-[#E8E6E1]">
            Access required
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full rounded border border-[#1E1E21] bg-[#111113] px-4 py-3 text-[#E8E6E1] placeholder-[#6B6868] text-sm focus:border-[#8B0000] focus:outline-none transition-colors"
          />
          {error && <p className="text-[#8B0000] text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded bg-[#8B0000] px-4 py-3 text-sm font-medium text-[#E8E6E1] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
