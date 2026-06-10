'use client'

import { useState, useRef, useEffect } from 'react'
import type { AgentId } from '@/lib/agents'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AgentChatProps {
  agentId: AgentId
  agentName: string
  starterPrompts: string[]
}

export default function AgentChat({ agentId, agentName, starterPrompts }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Stable per chat session — lets the server upsert one auto session note
  const conversationIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  )

  const hasMessages = messages.length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function send(text: string) {
    if (!text.trim() || streaming) return

    const userMessage: Message = { role: 'user', content: text }
    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setStreaming(true)

    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          message: text,
          conversationHistory: history,
          conversationId: conversationIdRef.current,
        }),
      })

      if (!res.ok || !res.body) {
        const body = await res.text()
        let detail = body
        try { detail = JSON.parse(body).error } catch {}
        throw new Error(`${res.status}: ${detail}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Agent unavailable — try again. (${err instanceof Error ? err.message : 'Unknown error'})`,
        }
        return updated
      })
    } finally {
      setStreaming(false)
      textareaRef.current?.focus()
    }
  }

  async function endSession() {
    if (messages.length < 2) {
      setToast('Nothing to save yet')
      return
    }
    if (saving) return

    setSaving(true)
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          conversationHistory: messages,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setToast('Session saved to Drive')
      } else {
        setToast('Session could not be saved')
        console.error('[EndSession]', data.error)
      }
    } catch (err) {
      setToast('Session could not be saved')
      console.error('[EndSession]', err)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Toast */}
      {toast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded bg-[#1E1E21] border border-[#2E2E31] text-[#E8E6E1] text-xs shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      {/* End session button */}
      {hasMessages && (
        <div className="flex justify-end px-4 pt-2 shrink-0">
          <button
            onClick={endSession}
            disabled={saving || streaming}
            className="text-[#6B6868] hover:text-[#A8A5A0] text-[10px] transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'End & Save Session'}
          </button>
        </div>
      )}

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {!hasMessages && (
          <div className="space-y-6">
            <p className="text-[#6B6868] text-sm">
              Ask {agentName} anything, or choose a starting point:
            </p>
            <div className="flex flex-col gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="text-left px-4 py-3 rounded border border-[#1E1E21] bg-[#111113] text-[#E8E6E1] text-sm hover:border-[#8B0000] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#8B0000] text-[#E8E6E1]'
                  : 'bg-[#111113] border border-[#1E1E21] text-[#E8E6E1]'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#C8920A] animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1E1E21] px-4 py-4">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agentName}…`}
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none rounded border border-[#1E1E21] bg-[#111113] px-4 py-3 text-[#E8E6E1] placeholder-[#6B6868] text-sm focus:border-[#8B0000] focus:outline-none transition-colors disabled:opacity-50 max-h-40 overflow-y-auto"
            style={{ minHeight: '44px' }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 160) + 'px'
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="rounded bg-[#8B0000] px-4 py-3 text-sm font-medium text-[#E8E6E1] transition-opacity hover:opacity-90 disabled:opacity-30 shrink-0"
          >
            {streaming ? '…' : 'Send'}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-[#6B6868]">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  )
}
