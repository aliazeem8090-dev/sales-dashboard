'use client'

interface RepEntry {
  rank: number
  name: string
  totalProposals: number
  hires: number
  hireRate: number
  replyRate: number
  consistencyScore: number
}

export function Leaderboard({ reps }: { reps: RepEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(30,37,51,1)' }}>
            <th className="pb-2 text-left font-medium text-slate-600 uppercase tracking-wider w-8">#</th>
            <th className="pb-2 text-left font-medium text-slate-600 uppercase tracking-wider">Rep</th>
            <th className="pb-2 text-right font-medium text-slate-600 uppercase tracking-wider">Proposals</th>
            <th className="pb-2 text-right font-medium text-slate-600 uppercase tracking-wider">Hires</th>
            <th className="pb-2 text-right font-medium text-slate-600 uppercase tracking-wider">Hire %</th>
            <th className="pb-2 text-right font-medium text-slate-600 uppercase tracking-wider">Reply %</th>
            <th className="pb-2 text-right font-medium text-slate-600 uppercase tracking-wider">Consistency</th>
          </tr>
        </thead>
        <tbody>
          {reps.map((rep) => (
            <tr key={rep.name} className="transition-colors hover:bg-slate-800/20" style={{ borderBottom: '1px solid rgba(30,37,51,0.6)' }}>
              <td className="py-2.5 text-slate-600 font-medium">{rep.rank}</td>
              <td className="py-2.5">
                <span className="font-medium text-slate-300">{rep.name}</span>
              </td>
              <td className="py-2.5 text-right text-slate-500">{rep.totalProposals}</td>
              <td className="py-2.5 text-right text-slate-500">{rep.hires}</td>
              <td className="py-2.5 text-right">
                <span className={`font-semibold ${rep.hireRate >= 10 ? 'text-emerald-400' : rep.hireRate >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                  {rep.hireRate}%
                </span>
              </td>
              <td className="py-2.5 text-right">
                <span className={`font-semibold ${rep.replyRate >= 20 ? 'text-emerald-400' : rep.replyRate >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                  {rep.replyRate}%
                </span>
              </td>
              <td className="py-2.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 rounded-full h-1.5" style={{ background: 'rgba(30,37,51,1)' }}>
                    <div
                      className="h-1.5 bg-violet-500 rounded-full"
                      style={{ width: `${rep.consistencyScore || 0}%` }}
                    />
                  </div>
                  <span className="text-slate-600 w-8 text-right">{rep.consistencyScore || 0}%</span>
                </div>
              </td>
            </tr>
          ))}
          {reps.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-slate-600 text-sm">No rep data yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
