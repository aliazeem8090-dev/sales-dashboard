'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ProposalCard } from './ProposalCard'

interface ColumnConfig {
  id: string
  label: string
  accent: string
  dotColor: string
}

interface KanbanColumnProps {
  column: ColumnConfig
  proposals: any[]
}

export function KanbanColumn({ column, proposals }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex flex-col min-w-[240px] w-[240px] shrink-0">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-t-2 ${column.accent} bg-[#0a0b10]`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${column.dotColor}`} />
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
            {column.label}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">
          {proposals.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 min-h-[120px] p-2 rounded-b-lg border border-t-0 border-slate-800/60 bg-[#080810]
          transition-colors duration-150
          ${isOver ? 'bg-cyan-500/5 border-cyan-500/30' : ''}
        `}
      >
        <SortableContext items={proposals.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {proposals.map(proposal => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        </SortableContext>

        {proposals.length === 0 && (
          <div className={`
            flex items-center justify-center h-16 rounded-md border border-dashed
            text-[10px] text-slate-700 transition-colors duration-150
            ${isOver ? 'border-cyan-500/40 text-cyan-700' : 'border-slate-800'}
          `}>
            {isOver ? 'Drop here' : 'No proposals'}
          </div>
        )}
      </div>
    </div>
  )
}
