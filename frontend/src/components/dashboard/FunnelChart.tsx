'use client'

interface FunnelData {
  sent: number
  viewed: number
  replied: number
  interview: number
  hired: number
}

export function FunnelChart({ data }: { data: FunnelData }) {
  const stages = [
    { label: 'Sent',      value: data.sent,      color: 'bg-slate-500' },
    { label: 'Viewed',    value: data.viewed,    color: 'bg-blue-500' },
    { label: 'Replied',   value: data.replied,   color: 'bg-amber-500' },
    { label: 'Interview', value: data.interview, color: 'bg-violet-500' },
    { label: 'Hired',     value: data.hired,     color: 'bg-emerald-500' },
  ]
  const max = data.sent || 1

  return (
    <div className="space-y-2">
      {stages.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-16 text-right">{label}</span>
          <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(30,37,51,1)' }}>
            <div
              className={`h-full ${color} rounded-full transition-all duration-500`}
              style={{ width: `${Math.max(2, (value / max) * 100)}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-400 w-8 text-right">{value}</span>
          <span className="text-xs text-slate-600 w-12">
            {max > 0 ? `${Math.round((value / max) * 100)}%` : '0%'}
          </span>
        </div>
      ))}
    </div>
  )
}
