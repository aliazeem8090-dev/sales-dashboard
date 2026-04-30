'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { ProposalCard } from './ProposalCard'
import { InterviewLeadModal } from './InterviewLeadModal'
import { api } from '@/lib/api'

// Column definitions — maps to ProposalStatus enum values on backend
const COLUMNS = [
  { id: 'SENT',      label: 'Sent',      accent: 'border-slate-500',   dotColor: 'bg-slate-400' },
  { id: 'VIEWED',    label: 'Viewed',    accent: 'border-blue-500',    dotColor: 'bg-blue-400' },
  { id: 'REPLIED',   label: 'Replied',   accent: 'border-indigo-500',  dotColor: 'bg-indigo-400' },
  { id: 'INTERVIEW', label: 'Interview', accent: 'border-violet-500',  dotColor: 'bg-violet-400' },
  { id: 'HIRED',     label: 'Closed',    accent: 'border-emerald-500', dotColor: 'bg-emerald-400' },
  { id: 'LOST',      label: 'Lost',      accent: 'border-red-500',     dotColor: 'bg-red-400' },
]

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

interface KanbanBoardProps {
  initialProposals: any[]
}

export function KanbanBoard({ initialProposals }: KanbanBoardProps) {
  const [proposals, setProposals] = useState<any[]>(initialProposals)
  const [activeProposal, setActiveProposal] = useState<any | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [pendingInterview, setPendingInterview] = useState<{
    proposalId: string; repId: string; originalStatus: string
  } | null>(null)
  const dragOriginStatus = useRef<string | null>(null)
  const isDragging = useRef(false)

  // Sync internal state when search filter changes (only when not dragging)
  useEffect(() => {
    if (!isDragging.current) {
      setProposals(initialProposals)
    }
  }, [initialProposals])

  const grouped = groupByStatus(proposals)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const findColumn = useCallback((proposalId: string): ColumnId | null => {
    for (const col of COLUMNS) {
      if (grouped[col.id]?.find((p: any) => p.id === proposalId)) return col.id as ColumnId
    }
    return null
  }, [grouped])

  function handleDragStart(event: DragStartEvent) {
    const proposal = proposals.find(p => p.id === event.active.id)
    setActiveProposal(proposal || null)
    dragOriginStatus.current = proposal?.status ?? null
    isDragging.current = true
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Determine source and target column
    const sourceCol = findColumn(activeId)
    const targetCol = COLUMNS.find(c => c.id === overId)?.id as ColumnId
      || findColumn(overId)

    if (!sourceCol || !targetCol || sourceCol === targetCol) return

    // Optimistically move card to new column
    setProposals(prev => prev.map(p =>
      p.id === activeId ? { ...p, status: targetCol } : p
    ))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveProposal(null)
    isDragging.current = false

    const activeId = active.id as string
    const originalStatus = dragOriginStatus.current
    dragOriginStatus.current = null

    if (!over) {
      // Dropped outside any column — revert optimistic update
      if (originalStatus) {
        setProposals(prev => prev.map(p =>
          p.id === activeId ? { ...p, status: originalStatus } : p
        ))
      }
      return
    }

    const overId = over.id as string

    const currentProposal = proposals.find(p => p.id === activeId)
    if (!currentProposal) return

    const targetCol = COLUMNS.find(c => c.id === overId)?.id as ColumnId
      || findColumn(overId)
    if (!targetCol) return

    // No change if dropped back on the same column it came from
    if (originalStatus === targetCol) return

    // Intercept moves to INTERVIEW — show lead capture modal first
    if (targetCol === 'INTERVIEW') {
      const proposal = proposals.find(p => p.id === activeId)
      setPendingInterview({
        proposalId: activeId,
        repId: proposal?.repId || '',
        originalStatus: originalStatus || 'SENT',
      })
      return
    }

    // Persist to backend
    setUpdatingId(activeId)
    try {
      await api.patch(`/proposals/${activeId}/status`, { status: targetCol })
    } catch (err) {
      console.error('Failed to update proposal status', err)
      // Revert on failure
      setProposals(prev => prev.map(p =>
        p.id === activeId ? { ...p, status: originalStatus ?? p.status } : p
      ))
    } finally {
      setUpdatingId(null)
    }
  }

  async function confirmInterview() {
    if (!pendingInterview) return
    const { proposalId, originalStatus } = pendingInterview
    setPendingInterview(null)
    setUpdatingId(proposalId)
    try {
      await api.patch(`/proposals/${proposalId}/status`, { status: 'INTERVIEW' })
    } catch {
      setProposals(prev => prev.map(p =>
        p.id === proposalId ? { ...p, status: originalStatus } : p
      ))
    } finally {
      setUpdatingId(null)
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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
  )
}
