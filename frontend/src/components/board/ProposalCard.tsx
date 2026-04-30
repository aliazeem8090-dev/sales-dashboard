'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ExternalLink, Zap, Calendar, DollarSign, Tag,
  ChevronDown, ChevronUp, FileText, Briefcase,
  AlertTriangle, Star, StickyNote, Pencil, Trash2,
} from 'lucide-react'
import { getStoredUser } from '@/lib/auth'
import { api } from '@/lib/api'

interface ProposalCardProps {
  proposal: any
  isDragging?: boolean
  onEdit?: (proposal: any) => void
  onDelete?: (id: string) => void
}

const NICHE_COLORS: Record<string, string> = {
  MERN:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Laravel:   'bg-red-500/20 text-red-400 border-red-500/30',
  AI_ML:     'bg-purple-500/20 text-purple-400 border-purple-500/30',
  WordPress: 'bg-green-500/20 text-green-400 border-green-500/30',
  General:   'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  SENT:      { label: 'Sent',      cls: 'bg-slate-700/40 text-slate-400 border-slate-600/30' },
  VIEWED:    { label: 'Viewed',    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  REPLIED:   { label: 'Replied',   cls: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25' },
  INTERVIEW: { label: 'Interview', cls: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
  HIRED:     { label: 'Closed',    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  LOST:      { label: 'Lost',      cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
  REJECTED:  { label: 'Rejected',  cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
}

function formatDate(d: string | Date | null) {
  if (!d) return '—'
  const date = new Date(d)
  const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff === 0) return 'Today'
  if (daysDiff === 1) return 'Yesterday'
  return `${daysDiff}d ago`
}

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = Math.round((score / max) * 100)
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-slate-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] font-mono text-slate-400 w-6 text-right shrink-0">{score}</span>
    </div>
  )
}

export function ProposalCard({ proposal, isDragging, onEdit, onDelete }: ProposalCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const user = typeof window !== 'undefined' ? getStoredUser() : null
  const isRep = user?.role === 'REP'

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/proposals/${proposal.id}`)
      onDelete?.(proposal.id)
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const {
    attributes, listeners, setNodeRef,
    transform, transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: proposal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  }

  const niche = proposal.profileUsed?.niche || 'General'
  const nicheClass = NICHE_COLORS[niche] || NICHE_COLORS.General
  const jobTitle = proposal.job?.title || 'Untitled Job'
  const jobUrl = proposal.job?.upworkJobUrl || null
  const preview = proposal.fullProposalText
    ? proposal.fullProposalText.slice(0, 100) + (proposal.fullProposalText.length > 100 ? '…' : '')
    : null
  const status = STATUS_LABELS[proposal.status] || STATUS_LABELS.SENT
  const aiScore = proposal.aiScore != null ? Math.round(proposal.aiScore) : null
  const scoreColor = aiScore == null ? '' : aiScore >= 70 ? 'text-emerald-400' : aiScore >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group bg-[#0f1117] border border-cyan-500/10 rounded-lg
        hover:border-violet-500/30 hover:shadow-[0_0_12px_rgba(124,111,255,0.1)]
        transition-all duration-150 select-none overflow-hidden
        ${isDragging ? 'shadow-[0_0_20px_rgba(124,111,255,0.3)] border-violet-500/50 rotate-1' : ''}
      `}
    >
      {/* ── Drag handle area ─────────────────────────────────── */}
      <div
        {...attributes}
        {...listeners}
        className="p-3 cursor-grab active:cursor-grabbing"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-xs font-semibold text-slate-200 leading-snug line-clamp-2 flex-1">{jobTitle}</p>
          {jobUrl && (
            <a
              href={jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              className="shrink-0 text-slate-600 hover:text-violet-400 transition-colors mt-0.5"
            >
              <ExternalLink size={11} />
            </a>
          )}
        </div>

        {/* Profile niche badge */}
        {proposal.profileUsed && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${nicheClass} mb-2`}>
            <Tag size={8} />
            {proposal.profileUsed.niche || 'General'}
          </span>
        )}

        {/* Proposal preview */}
        {preview && !expanded && (
          <p className="text-[10px] text-slate-500 leading-relaxed mb-2 line-clamp-2">{preview}</p>
        )}

        {/* Skills */}
        {proposal.job?.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {proposal.job.skills.slice(0, expanded ? undefined : 3).map((skill: string) => (
              <span key={skill} className="text-[9px] bg-slate-800/60 text-slate-400 px-1.5 py-0.5 rounded">
                {skill}
              </span>
            ))}
            {!expanded && proposal.job.skills.length > 3 && (
              <span className="text-[9px] text-slate-600">+{proposal.job.skills.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
              <Zap size={9} className="text-amber-500" />
              {proposal.connectsUsed || 0}
            </span>
            {proposal.job?.clientBudget && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                <DollarSign size={9} className="text-emerald-500" />
                {proposal.job.clientBudget.toLocaleString()}
              </span>
            )}
            {proposal.contractValue && (
              <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold">
                <DollarSign size={9} />
                {proposal.contractValue.toLocaleString()}
              </span>
            )}
            {aiScore != null && (
              <span className={`text-[9px] font-mono font-bold ${scoreColor}`}>
                AI {aiScore}
              </span>
            )}
          </div>
          <span className="flex items-center gap-0.5 text-[10px] text-slate-600">
            <Calendar size={9} />
            {formatDate(proposal.submittedAt)}
          </span>
        </div>
      </div>

      {/* ── Expand toggle ─────────────────────────────────────── */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
        className={`w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium transition-all border-t ${
          expanded
            ? 'text-violet-400 hover:text-violet-300 border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10'
            : 'text-slate-400 hover:text-slate-200 border-slate-700/60 hover:bg-slate-800/60'
        }`}
      >
        {expanded ? (
          <><ChevronUp size={11} /> Collapse</>
        ) : (
          <><ChevronDown size={11} /> Show Details</>
        )}
      </button>

      {/* ── Expanded details ──────────────────────────────────── */}
      {expanded && (
        <div
          onPointerDown={e => e.stopPropagation()}
          className="px-3 pb-3 space-y-3 border-t border-slate-800/60"
        >
          {/* Status */}
          <div className="pt-2 flex items-center gap-2">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${status.cls}`}>
              {status.label}
            </span>
            {proposal.manualScore != null && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                <Star size={9} />
                {proposal.manualScore} manual
              </span>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Submitted', val: proposal.submittedAt },
              { label: 'Viewed',    val: proposal.viewedAt },
              { label: 'Replied',   val: proposal.repliedAt },
              { label: 'Interview', val: proposal.interviewAt },
              { label: 'Hired',     val: proposal.hiredAt },
            ].filter(d => d.val).map(d => (
              <div key={d.label} className="flex flex-col">
                <span className="text-[8px] text-slate-600 uppercase tracking-wider">{d.label}</span>
                <span className="text-[10px] text-slate-400">{formatDate(d.val)}</span>
              </div>
            ))}
          </div>

          {/* Job description */}
          {proposal.job?.description && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Briefcase size={9} className="text-slate-600" />
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Job Description</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed max-h-28 overflow-y-auto pr-1 whitespace-pre-wrap">
                {proposal.job.description}
              </p>
            </div>
          )}

          {/* Full proposal text */}
          {proposal.fullProposalText && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <FileText size={9} className="text-slate-600" />
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Proposal Text</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed max-h-36 overflow-y-auto pr-1 whitespace-pre-wrap font-mono">
                {proposal.fullProposalText}
              </p>
            </div>
          )}

          {/* AI score breakdown */}
          {aiScore != null && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">AI Score</span>
                <span className={`text-xs font-bold font-mono ${scoreColor}`}>{aiScore}/100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${aiScore >= 70 ? 'bg-emerald-500' : aiScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${aiScore}%` }}
                />
              </div>
            </div>
          )}

          {/* Improvement notes */}
          {proposal.improvementNotes && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <StickyNote size={9} className="text-slate-600" />
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Improvement Notes</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed whitespace-pre-wrap">
                {proposal.improvementNotes}
              </p>
            </div>
          )}

          {/* Lost reason */}
          {proposal.lostReason && (
            <div className="rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle size={9} className="text-red-500" />
                <span className="text-[9px] font-semibold text-red-500 uppercase tracking-wider">Lost Reason</span>
              </div>
              <p className="text-[10px] text-red-400 leading-relaxed">{proposal.lostReason}</p>
            </div>
          )}

          {/* Contract value */}
          {proposal.contractValue && (
            <div className="rounded-lg p-2 flex items-center justify-between" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <span className="text-[9px] font-semibold text-emerald-500 uppercase tracking-wider">Contract Value</span>
              <span className="text-sm font-bold font-mono text-emerald-400">${proposal.contractValue.toLocaleString()}</span>
            </div>
          )}

          {/* Edit / Delete — rep only */}
          {isRep && (
            <div className="pt-1 flex items-center gap-2">
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onEdit?.(proposal) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 transition-colors"
              >
                <Pencil size={11} /> Edit
              </button>

              {confirmDelete ? (
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[10px] text-slate-500">Delete this proposal?</span>
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); handleDelete() }}
                    disabled={deleting}
                    className="px-2 py-1 text-[10px] font-semibold rounded text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {deleting ? '…' : 'Yes'}
                  </button>
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}
                    className="px-2 py-1 text-[10px] rounded text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors ml-auto"
                >
                  <Trash2 size={11} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
