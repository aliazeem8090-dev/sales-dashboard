import { supabase } from '../supabase';

export async function findByRep(repId: string) {
  const { data, error } = await supabase.from('coaching_insight').select('*').eq('repId', repId).order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function findTeamInsights(companyId: string | null) {
  let repQuery = supabase.from('profiles').select('repId').eq('role', 'REP').not('repId', 'is', null);
  if (companyId) repQuery = repQuery.eq('companyId', companyId);
  const { data: repRows, error: repErr } = await repQuery;
  if (repErr) throw new Error(repErr.message);
  const repIds = (repRows || []).map((r: any) => r.repId);
  if (repIds.length === 0) return [];

  const { data: insights, error } = await supabase
    .from('coaching_insight')
    .select('*')
    .in('repId', repIds)
    .order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);

  const { data: repRowsFull } = await supabase.from('rep').select('id,userId').in('id', repIds);
  const userIds = Array.from(new Set((repRowsFull || []).map((r: any) => r.userId)));
  const { data: users } = userIds.length ? await supabase.from('profiles').select('id,name').in('id', userIds) : { data: [] as any[] };
  const nameByRepId = new Map<string, string>();
  for (const r of repRowsFull || []) {
    const name = (users || []).find((u: any) => u.id === r.userId)?.name;
    if (name) nameByRepId.set(r.id, name);
  }

  return (insights || []).map((ins: any) => ({ ...ins, rep: { user: { name: nameByRepId.get(ins.repId) || null } } }));
}

export async function markRead(id: string) {
  const { data, error } = await supabase.from('coaching_insight').update({ isRead: true }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createNote(repId: string, note: string, severity: string) {
  const { data, error } = await supabase
    .from('coaching_insight')
    .insert({ repId, insightType: 'MANAGER_NOTE', generatedInsight: note, severity, isRead: false })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function generateForRep(repId: string) {
  const { data: proposalsRaw } = await supabase.from('proposal').select('status').eq('repId', repId);
  const proposals = proposalsRaw || [];
  const { data: rep } = await supabase.from('rep').select('currentConnects').eq('id', repId).single();

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: recentLogs } = await supabase.from('activity_log').select('id').eq('repId', repId).gte('date', oneWeekAgo);
  const { data: prevWeekLogs } = await supabase.from('activity_log').select('id').eq('repId', repId).gte('date', twoWeeksAgo).lt('date', oneWeekAgo);
  const recentCount = (recentLogs || []).length;
  const prevCount = (prevWeekLogs || []).length;

  const insights: Record<string, unknown>[] = [];
  const total = proposals.length;

  if (total > 0) {
    const replied = proposals.filter((p: any) => ['REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
    const viewed = proposals.filter((p: any) => ['VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
    const hired = proposals.filter((p: any) => p.status === 'HIRED').length;
    const replyRate = (replied / total) * 100;
    const viewRate = (viewed / total) * 100;
    const hireRate = (hired / total) * 100;

    if (total >= 10 && replyRate < 15) {
      insights.push({
        repId,
        insightType: 'PROPOSAL_QUALITY',
        generatedInsight: `Sending volume is good (${total} proposals) but reply rate is only ${replyRate.toFixed(1)}% — below the 15% benchmark. Focus on personalization and hook strength in your next 5 proposals.`,
        severity: 'HIGH',
      });
    }
    if (total >= 20 && viewRate === 0) {
      insights.push({
        repId,
        insightType: 'PROPOSAL_QUALITY',
        generatedInsight: `None of your last ${total} proposals have been viewed. This may indicate title/opening issues or profile visibility problems. Try A/B testing two different hooks this week.`,
        severity: 'CRITICAL',
      });
    }
    if (hireRate > 10) {
      insights.push({
        repId,
        insightType: 'PERFORMANCE',
        generatedInsight: `Strong performance — hire rate is ${hireRate.toFixed(1)}%, above the 10% target. Your proposal approach is working well. Consider documenting your best-performing proposal as a template.`,
        severity: 'LOW',
      });
    }
  }

  if (recentCount < prevCount && prevCount > 0) {
    insights.push({
      repId,
      insightType: 'ACTIVITY',
      generatedInsight: `Activity dropped this week: ${recentCount} log entries vs ${prevCount} last week. Check challenge logs to identify blockers.`,
      severity: 'MEDIUM',
    });
  }

  const daysSinceLastLog = recentCount === 0 ? 7 : 0;
  if (daysSinceLastLog >= 3) {
    insights.push({
      repId,
      insightType: 'ACTIVITY',
      generatedInsight: `No activity logged in the past ${daysSinceLastLog} days. Consistency is key to pipeline health — even low-activity days should be logged with a justification.`,
      severity: 'HIGH',
    });
  }

  if (rep && rep.currentConnects < 10) {
    insights.push({
      repId,
      insightType: 'ACTIVITY',
      generatedInsight: `Connects are running low (${rep.currentConnects} remaining). Prioritize high-fit jobs to maximize return on remaining connects. Flag this to your manager for a top-up if needed.`,
      severity: 'HIGH',
    });
  }

  if (insights.length === 0) return [];
  const { data: saved, error } = await supabase.from('coaching_insight').insert(insights).select();
  if (error) throw new Error(error.message);
  return saved || [];
}
