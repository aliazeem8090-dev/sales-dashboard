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
  pointerWithin,
  rectIntersection,
  UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
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

// Prefer pointer-within detection (better for column drops), fall back to rect intersection
function collisionDetect(args: Parameters<typeof pointerWithin>[0]) {
  const pw = pointerWithin(args)
  if (pw.length > 0) return pw
  return rectIntersection(args)
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
  const pendingTargetCol = useRef<ColumnId | null>(null)
  const isDragging = useRef(false)

  useEffect(() => {
    if (!isDragging.current) setProposals(initialProposals)
  }, [initialProposals])

  const grouped = groupByStatus(proposals)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  // Map proposal id → its current column id
  const findColumn = useCallback((id: UniqueIdentifier): ColumnId | null => {
    const sid = id as string
    if (COLUMN_IDS.has(sid)) return sid as ColumnId
    for (const col of COLUMNS) {
      if (grouped[col.id]?.some((p: any) => p.id === sid)) return col.id as ColumnId
    }
    return null
  }, [grouped])

  function handleDragStart(event: DragStartEvent) {
    const proposal = proposals.find(p => p.id === event.active.id)
    setActiveProposal(proposal ?? null)
    dragOriginStatus.current = proposal?.status ?? null
    pendingTargetCol.current = null
    isDragging.current = true
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const sourceCol = findColumn(activeId)
    const targetCol = findColumn(overId)

    if (!targetCol) return
    pendingTargetCol.current = targetCol

    if (!sourceCol || sourceCol === targetCol) return

    // Optimistically move card to target column
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
    const targetCol = pendingTargetCol.current
    dragOriginStatus.current = null
    pendingTargetCol.current = null

    // Dropped outside — revert
    if (!over || !targetCol) {
      if (originalStatus) {
        setProposals(prev => prev.map(p =>
          p.id === activeId ? { ...p, status: originalStatus } : p
        ))
      }
      return
    }

    // No status change
    if (originalStatus === targetCol) return

    // Moving to INTERVIEW — show lead capture modal first
    if (targetCol === 'INTERVIEW') {
      const proposal = proposals.find(p => p.id === activeId)
      setPendingInterview({
        proposalId: activeId,
        repId: proposal?.repId || '',
        originalStatus: originalStatus || 'SENT',
      })
      return
    }

    // Persist status change
    setUpdatingId(activeId)
    try {
      await api.patch(`/proposals/${activeId}/status`, { status: targetCol })
    } catch {
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
