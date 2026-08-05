'use client'

import { useState, useRef, useEffect } from 'react'
import { invokeAi } from '@/lib/ai'
import { getStoredUser } from '@/lib/auth'
import { Send, MessageSquare } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STARTER_PROMPTS = [
  'Why am I not getting replies to my proposals?',
  'How should I write a hook for a Laravel API job?',
  'Which jobs should I avoid with my MERN profile?',
  'How do I improve my Upwork profile visibility?',
  'What makes a strong CTA in a proposal?',
  'Rewrite my proposal for an AI/ML job',
]

export default function ChatPage() {
  const user = getStoredUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const message = (text || input).trim()
    if (!message || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: message }])
    setLoading(true)

    try {
      const context = {
        role: user?.role,
        profile: user?.assignedProfileId ? { profileId: user.assignedProfileId } : null,
        teamProfiles: ['MERN', 'Laravel', 'AI/ML Python', 'WordPress'],
      }
      const data = await invokeAi<{ response: string }>({ action: 'message', message, context })
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I could not process that. ' + (err.message || 'Check your OpenAI API key.'),
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-screen relative z-10" style={{ background: 'var(--ink)' }}>
      {/* Header */}
      <div className="px-6 py-4 shrink-0 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,111,255,0.1)', border: '1px solid rgba(124,111,255,0.2)' }}>
          <MessageSquare size={13} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-200">AI Assistant</h1>
          <p className="text-[10px] text-slate-500">Ask about proposals, job fit, or team performance</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto pt-4">
            <p className="text-xs text-slate-600 mb-3">Try one of these:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARTER_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => send(p)}
                  className="text-left px-4 py-3 rounded-xl text-xs text-slate-400 hover:text-slate-300 transition-colors"
                  style={{ background: 'var(--ink2)', border: '1px solid rgba(30,37,51,0.8)' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
              }`}
              style={msg.role === 'user'
                ? { background: 'rgba(124,111,255,0.12)', border: '1px solid rgba(124,111,255,0.2)', color: '#e2e8f0' }
                : { background: 'var(--ink2)', border: '1px solid rgba(30,37,51,0.8)', color: '#94a3b8' }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2" style={{ background: 'var(--ink2)', border: '1px solid rgba(30,37,51,0.8)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 shrink-0" style={{ borderTop: '1px solid rgba(30,37,51,0.8)', background: 'var(--ink)' }}>
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
            placeholder="Ask about proposals, job fit, profile strategy…"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-slate-200 resize-none focus:outline-none transition-colors"
            style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.2)' }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl transition-all disabled:opacity-30 shrink-0"
            style={{ background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)' }}
          >
            <Send size={15} className="text-violet-400" />
          </button>
        </div>
        <p className="text-[10px] text-slate-700 text-center mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
