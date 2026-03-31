'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'

const PROFILE_TYPES = ['MERN', 'LARAVEL', 'AI_ML', 'WORDPRESS', 'GENERAL']

const CATEGORY_LABELS: Record<string, string> = {
  hook: 'Hook Strength',
  personalization: 'Personalization',
  painPoints: 'Pain Point Clarity',
  technicalCredibility: 'Technical Credibility',
  portfolio: 'Portfolio Relevance',
  cta: 'CTA Strength',
  toneBrevity: 'Tone & Brevity',
  profileAlignment: 'Profile Alignment',
}

function ScoreBar({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const pct = (score / max) * 100
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-slate-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(30,37,51,1)' }}>
        <div className={`h-1.5 ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-semibold text-slate-400 w-6 text-right">{score}</span>
    </div>
  )
}

function ReviewContent() {
  const searchParams = useSearchParams()
  const proposalId = searchParams.get('proposalId')

  const [proposalText, setProposalText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [profileType, setProfileType] = useState('GENERAL')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'scores' | 'rewrite' | 'suggestions'>('scores')

  useEffect(() => {
    if (proposalId) {
      api.get<any>(`/proposals/${proposalId}`).then(p => {
        if (p?.fullProposalText) setProposalText(p.fullProposalText)
      }).catch(() => {})
    }
  }, [proposalId])

  async function handleReview() {
    if (!proposalText.trim()) return
    setError('')
    setLoading(true)
    try {
      const data = await api.post<any>('/chat/review-proposal', {
        proposalText,
        profileType,
        jobDescription: jobDescription || undefined,
      })
      setResult(data)

      if (proposalId) {
        await api.post('/proposal-reviews', {
          proposalId,
          overallScore: data.overallScore,
          parameterScores: data.categoryScores,
          missingElements: data.missingElements,
          suggestions: data.suggestions,
          improvedHook: data.improvedHook,
          rewrittenVersion: data.rewrittenVersion,
          modelOutputSnapshot: data,
        })
        await api.put(`/proposals/${proposalId}`, { aiScore: data.overallScore })
      }
    } catch (err: any) {
      setError(err.message || 'Review failed. Check your OpenAI API key.')
    } finally {
      setLoading(false)
    }
  }

  const cardStyle = { background: '#0a0b10', border: '1px solid rgba(30,37,51,0.8)' }
  const inputStyle = { background: '#07080d', border: '1px solid rgba(100,116,139,0.2)' }
  const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 focus:outline-none transition-colors"
  const labelClass = "block text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider"

  return (
    <div className="p-6 relative z-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-200">Proposal Review</h1>
          <p className="text-xs text-slate-500 mt-0.5">Paste your proposal for AI scoring, diagnosis, and a full rewrite.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Input panel */}
          <div className="space-y-4">
            <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
              <div>
                <label className={labelClass}>Profile Type</label>
                <select value={profileType} onChange={e => setProfileType(e.target.value)} className={inputClass} style={inputStyle}>
                  {PROFILE_TYPES.map(p => <option key={p} value={p}>{p.replace('_', '/')}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Job Description <span className="normal-case text-slate-600">(optional but improves accuracy)</span></label>
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  rows={4}
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                  placeholder="Paste the job description here…"
                />
              </div>
            </div>

            <div className="rounded-xl p-5" style={cardStyle}>
              <label className={labelClass}>Your Proposal</label>
              <textarea
                value={proposalText}
                onChange={e => setProposalText(e.target.value)}
                rows={14}
                className={`${inputClass} resize-none font-mono text-xs leading-relaxed`}
                style={inputStyle}
                placeholder="Paste your proposal text here…"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg text-red-400 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleReview}
              disabled={loading || !proposalText.trim()}
              className="w-full py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9' }}
            >
              {loading ? 'Analyzing…' : 'Analyze Proposal'}
            </button>
          </div>

          {/* Results panel */}
          <div>
            {!result && !loading && (
              <div className="rounded-xl p-8 text-center" style={cardStyle}>
                <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.1)' }}>
                  <div className="w-3 h-3 rounded-full bg-cyan-500/30" />
                </div>
                <p className="text-slate-500 text-sm">Results will appear here after analysis.</p>
              </div>
            )}

            {loading && (
              <div className="rounded-xl p-8 text-center" style={cardStyle}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-slate-400 text-sm">Analyzing with AI…</p>
                <p className="text-slate-600 text-xs mt-1">This takes about 10–15 seconds.</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Overall score */}
                <div className="rounded-xl p-5" style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-1">Overall Score</p>
                      <p className={`text-5xl font-bold font-mono ${
                        result.overallScore >= 70 ? 'text-emerald-400' :
                        result.overallScore >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {result.overallScore}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-1">out of 100 · min 70 to send</p>
                    </div>
                    <div className="text-right">
                      {result.overallScore >= 70 ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
                          Ready to send
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                          Needs work
                        </span>
                      )}
                    </div>
                  </div>

                  {result.whyItMayNotConvert && (
                    <div className="mt-4 px-3 py-2.5 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <p className="font-semibold text-amber-400 mb-1">Why it may not convert</p>
                      <p className="text-amber-300/70 leading-relaxed">{result.whyItMayNotConvert}</p>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="rounded-xl overflow-hidden" style={cardStyle}>
                  <div className="flex" style={{ borderBottom: '1px solid rgba(30,37,51,1)' }}>
                    {(['scores', 'rewrite', 'suggestions'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                          activeTab === tab
                            ? 'text-cyan-400 border-b-2 border-cyan-500'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        {tab === 'scores' ? 'Scores' : tab === 'rewrite' ? 'Rewrite' : 'Suggestions'}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {activeTab === 'scores' && result.categoryScores && (
                      <div className="space-y-3">
                        {Object.entries(result.categoryScores).map(([key, score]) => (
                          <ScoreBar key={key} label={CATEGORY_LABELS[key] || key} score={score as number} />
                        ))}
                      </div>
                    )}

                    {activeTab === 'rewrite' && (
                      <div className="space-y-4">
                        {result.improvedHook && (
                          <div>
                            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">Improved Hook</p>
                            <div className="px-3 py-2.5 rounded-lg text-xs text-emerald-300/80 leading-relaxed" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                              {result.improvedHook}
                            </div>
                          </div>
                        )}
                        {result.rewrittenVersion && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Rewrite</p>
                            <div className="px-3 py-2.5 rounded-lg text-[11px] text-slate-400 whitespace-pre-wrap font-mono leading-relaxed" style={{ background: '#07080d', border: '1px solid rgba(30,37,51,1)' }}>
                              {result.rewrittenVersion}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'suggestions' && (
                      <div className="space-y-4">
                        {result.missingElements?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">Missing Elements</p>
                            <ul className="space-y-1.5">
                              {result.missingElements.map((item: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                  <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.suggestions?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">Recommendations</p>
                            <ul className="space-y-1.5">
                              {result.suggestions.map((item: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                  <span className="text-cyan-500 mt-0.5 shrink-0">→</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    }>
      <ReviewContent />
    </Suspense>
  )
}
