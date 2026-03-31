'use client'

interface KPICardProps {
  label: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function KPICard({ label, value, sub, trend }: KPICardProps) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0a0b10', border: '1px solid rgba(30,37,51,0.8)' }}>
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-slate-200 mt-1">{value}</p>
      {sub && (
        <p className={`text-xs mt-1 ${
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-600'
        }`}>
          {sub}
        </p>
      )}
    </div>
  )
}
