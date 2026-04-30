'use client'

import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core'
import { KanbanColumn } from './KanbanColumn'
import { ProposalCard } from './ProposalCard'
import { InterviewLeadModal } from './InterviewLeadModal'
import { api } from '@/lib/api'

const COLUMNS = [
  { id: 'SENT',      label: 'Sent',      accent: 'border-slate-500',   dotColor: 'bg-slate-400' },
  { id: 'VIEWED',    label: 'Viewed',    accent: 'border-blue-500',    dotColor: 'bg-blue-400' },
  { id: 'REPLIED',   label: 'Replied',   accent: 'border-indigo-500',  dotColor: 'bg-indigo-400' },
  { id: 'INTERVIEW', label: 'Interview', accent: 'border-violet-500',  dotColor: 'bg-violet-400' },
  { id: 'HIRED',     label: 'Closed',    accent: 'border-emerald-500', dotColor: 'bg-emerald-400' },
  { id: 'LOST',      label: 'Lost',      accent: 'border-red-500',     dotColor: 'bg-red-400' },
]

const COLUMN_IDS = new Set(COLUMNS.map(c => c.id))
type ColumnId = 'SENT' | 'VIEWED' | 'REPLIED' | 'INTERVIEW' | 'HIRED' | 'LOST'

function groupByStatus(proposals: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {}
  for (const col of COLUMNS) groups[col.id] = []
  for (const p of proposals) {
    const key = p.status === 'REJECTED' ? 'LOST' : (p.status || 'SENT')
    if (groups[key]) groups[key].push(p)
    else groups['SENT'].push(p)
  }
  return groups
}

function resolveColFromId(id: string, proposals: any[]): ColumnId | null {
  // Direct column hit
  if (COLUMN_IDS.has(id)) return id as ColumnId
  // It's a card id — look up its current status
  const card = proposals.find((p: any) => p.id === id)
  if (!card) return null
  const s = card.status === 'REJECTED' ? 'LOST' : (card.status || 'SENT')
  return COLUMN_IDS.has(s) ? (s as ColumnId) : null
}

function collisionDetect(args: Parameters<typeof pointerWithin>[0]) {
  const pw = pointerWithin(args)
  return pw.length > 0 ? pw : rectIntersection(args)
}

interface KanbanBoardProps {
  initialProposals: any[]
}

export function KanbanBoard({ initialProposals }: KanbanBoardProps) {
  const [proposals, setProposals] = useState<any[]>(initialProposals)
  const [activeProposal, setActiveProposal] = useState<any | null>(null)
  const [pendingInterview, setPendingInterview] = useState<{
    proposalId: string; repId: string; originalStatus: string
  } | null>(null)

  // Always-current ref — avoids stale closure in drag handlers
  const proposalsRef = useRef(proposals)
  proposalsRef.current = proposals

  const dragOriginStatus = useRef<string | null>(null)
  const isDragging = useRef(false)

  useEffect(() => {
    if (!isDragging.current) setProposals(initialProposals)
  }, [initialProposals])

  const grouped = groupByStatus(proposals)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const proposal = proposals.find(p => p.id === event.active.id)
    setActiveProposal(proposal ?? null)
    dragOriginStatus.current = proposal?.status ?? null
    isDragging.current = true
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const targetCol = resolveColFromId(over.id as string, proposalsRef.current)
    if (!targetCol) return

    // Optimistic visual update — move card to target column while dragging
    setProposals(prev => {
      const current = resolveColFromId(activeId, prev)
      if (current === targetCol) return prev
      return prev.map(p => p.id === activeId ? { ...p, status: targetCol } : p)
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveProposal(null)
    isDragging.current = false

    const activeId = active.id as string
    const originalStatus = dragOriginStatus.current
    dragOriginStatus.current = null

    if (!over) {
      // Dropped outside — revert
      setProposals(prev => prev.map(p =>
        p.id === activeId ? { ...p, status: originalStatus ?? p.status } : p
      ))
      return
    }

    // Derive target column from the drop event (authoritative — don't rely on handleDragOver side-effects)
    const targetCol = resolveColFromId(over.id as string, proposalsRef.current)
    if (!targetCol) return

    // Ensure card is visually in the target column (in case handleDragOver missed it)
    setProposals(prev => prev.map(p =>
      p.id === activeId ? { ...p, status: targetCol } : p
    ))

    // No actual status change
    if (originalStatus === targetCol) return

    // Moving to REPLIED → show lead capture modal, persist after modal confirms
    if (targetCol === 'REPLIED') {
      const proposal = proposalsRef.current.find((p: any) => p.id === activeId)
      setPendingInterview({
        proposalId: activeId,
        repId: proposal?.repId || '',
        originalStatus: originalStatus || 'SENT',
      })
      return
    }

    // Persist all other status changes
    try {
      await api.patch(`/proposals/${activeId}/status`, { status: targetCol })
    } catch {
      setProposals(prev => prev.map(p =>
        p.id === activeId ? { ...p, status: originalStatus ?? p.status } : p
      ))
    }
  }

  async function confirmInterview() {
    if (!pendingInterview) return
    const { proposalId, originalStatus } = pendingInterview
    setPendingInterview(null)
    try {
      await api.patch(`/proposals/${proposalId}/status`, { status: 'REPLIED' })
    } catch {
      setProposals(prev => prev.map(p =>
        p.id === proposalId ? { ...p, status: originalStatus } : p
      ))
    }
  }

  function cancelInterview() {
    if (!pendingInterview) return
    const { proposalId, originalStatus } = pendingInterview
    setProposals(prev => prev.map(p =>
      p.id === proposalId ? { ...p, status: originalStatus } : p
    ))
    setPendingInterview(null)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetect}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-180px)]">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              proposals={grouped[col.id] || []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProposal ? (
            <div className="rotate-2 scale-105">
              <ProposalCard proposal={activeProposal} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingInterview && (
        <InterviewLeadModal
          proposalId={pendingInterview.proposalId}
          repId={pendingInterview.repId}
          onSaved={confirmInterview}
          onSkip={confirmInterview}
          onCancel={cancelInterview}
        />
      )}
    </>
  )
}
