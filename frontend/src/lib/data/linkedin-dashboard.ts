import { supabase } from '../supabase';

const DEFAULT_TARGETS = {
  dailyConnectionTarget: 35,
  monthlyInMailLimit: 50,
  minReplyRate: 10,
  minConversionRate: 5,
  leadProcessingRate: 50,
};

function kpiStatus(actual: number, target: number, higherIsBetter: boolean): 'pass' | 'warn' | 'fail' {
  if (target === 0) return 'pass';
  const ratio = higherIsBetter ? actual / target : target / actual;
  if (ratio >= 1) return 'pass';
  if (ratio >= 0.75) return 'warn';
  return 'fail';
}

const DAY_MS = 24 * 60 * 60 * 1000;
const dateStr = (d: Date) => d.toISOString().split('T')[0];

export async function getAgentDashboard(agentId: string) {
  const { data: agent } = await supabase.from('linkedin_agent').select('id,targets').eq('id', agentId).single();
  const t = { ...DEFAULT_TARGETS, ...(agent?.targets || {}) };

  const thirtyDaysAgo = dateStr(new Date(Date.now() - 30 * DAY_MS));
  const today = dateStr(new Date());

  const { data: allLogsRaw, error } = await supabase
    .from('linkedin_daily_log')
    .select('*')
    .eq('agentId', agentId)
    .gte('date', thirtyDaysAgo)
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  const allLogs = allLogsRaw || [];

  const todayLog = allLogs.find((l: any) => l.date === today) || null;

  const totalConnections = allLogs.reduce((s: number, l: any) => s + (l.connectionsSent || 0), 0);
  const totalJobs = allLogs.reduce((s: number, l: any) => s + (l.jobsApplied || 0), 0);
  const totalFollowUps = allLogs.reduce((s: number, l: any) => s + (l.followUpsSent || 0), 0);
  const totalLeadsSearched = allLogs.reduce((s: number, l: any) => s + (l.leadsSearched || 0), 0);

  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
  const fromMonth = dateStr(d);
  const monthlyInMails = allLogs.filter((l: any) => l.date >= fromMonth).reduce((s: number, l: any) => s + (l.inMailsSent || 0), 0);

  const { data: leadsRaw } = await supabase.from('linkedin_lead').select('*').eq('agentId', agentId);
  const leads = leadsRaw || [];
  const totalLeads = leads.length;
  const contacted = leads.filter((l: any) => ['CONTACTED', 'REPLIED', 'FOLLOWED_UP', 'CONVERTED'].includes(l.status)).length;
  const replied = leads.filter((l: any) => ['REPLIED', 'FOLLOWED_UP', 'CONVERTED'].includes(l.status)).length;
  const converted = leads.filter((l: any) => l.status === 'CONVERTED').length;
  const followedUp = leads.filter((l: any) => l.status === 'FOLLOWED_UP').length;

  const replyRate = contacted > 0 ? Math.round((replied / contacted) * 10000) / 100 : 0;
  const conversionRate = replied > 0 ? Math.round((converted / replied) * 10000) / 100 : 0;
  const processingRate = totalLeadsSearched > 0 ? Math.round((contacted / totalLeadsSearched) * 10000) / 100 : 0;
  const avgDailyConns = allLogs.length > 0 ? Math.round((totalConnections / allLogs.length) * 10) / 10 : 0;

  const cutoff = new Date(Date.now() - 4 * DAY_MS);
  const followUpRequired = leads.filter((l: any) => l.status === 'CONTACTED' && l.contactedAt && new Date(l.contactedAt) < cutoff);

  const kpis = {
    dailyConnections: { actual: avgDailyConns, target: t.dailyConnectionTarget, higherIsBetter: true, status: kpiStatus(avgDailyConns, t.dailyConnectionTarget, true) },
    monthlyInMails: { actual: monthlyInMails, target: t.monthlyInMailLimit, higherIsBetter: false, status: kpiStatus(monthlyInMails, t.monthlyInMailLimit, false) },
    replyRate: { actual: replyRate, target: t.minReplyRate, higherIsBetter: true, status: kpiStatus(replyRate, t.minReplyRate, true) },
    conversionRate: { actual: conversionRate, target: t.minConversionRate, higherIsBetter: true, status: kpiStatus(conversionRate, t.minConversionRate, true) },
    leadProcessingRate: { actual: processingRate, target: t.leadProcessingRate, higherIsBetter: true, status: kpiStatus(processingRate, t.leadProcessingRate, true) },
  };

  const alerts: { message: string; level: 'critical' | 'warn' | 'info' }[] = [];
  if (todayLog && (todayLog.connectionsSent || 0) > 40) alerts.push({ message: `Connections today (${todayLog.connectionsSent}) exceed the safe daily limit of 40 — risk of LinkedIn restriction`, level: 'critical' });
  if (followUpRequired.length > 0) alerts.push({ message: `${followUpRequired.length} lead${followUpRequired.length > 1 ? 's' : ''} contacted 4+ days ago with no reply — follow up now`, level: 'warn' });
  if (monthlyInMails >= 50) alerts.push({ message: `Monthly InMail limit reached (${monthlyInMails}/50) — InMails disabled until next month`, level: 'critical' });
  else if (monthlyInMails >= 40) alerts.push({ message: `Approaching monthly InMail limit — ${monthlyInMails}/50 used`, level: 'warn' });
  if (contacted >= 10 && replyRate < t.minReplyRate) alerts.push({ message: `Reply rate (${replyRate}%) is below your ${t.minReplyRate}% target — review your outreach messaging`, level: 'warn' });
  if (contacted >= 5 && conversionRate < t.minConversionRate) alerts.push({ message: `Conversion rate (${conversionRate}%) is below your ${t.minConversionRate}% target`, level: 'info' });

  const trend: { date: string; connections: number; replies: number; inmails: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = dateStr(new Date(Date.now() - i * DAY_MS));
    const log = allLogs.find((l: any) => l.date === date);
    trend.push({ date, connections: log?.connectionsSent || 0, replies: log?.repliesReceived || 0, inmails: log?.inMailsSent || 0 });
  }

  return {
    agentId,
    targets: t,
    today: todayLog,
    stats: { totalLeads, contacted, replied, converted, followedUp, replyRate, conversionRate, totalConnections, monthlyInMails, totalJobs, totalFollowUps, processingRate, avgDailyConns, totalLeadsSearched },
    kpis,
    followUpRequired,
    alerts,
    trend,
  };
}

export async function getAllAgentsPerformance(companyId: string | null) {
  const { data: profiles, error } = await supabase.from('profiles').select('id,name,companyId').eq('role', 'LINKEDIN_AGENT');
  if (error) throw new Error(error.message);

  const scoped = (profiles || []).filter((u: any) =>
    companyId === 'company-1' || !companyId ? (u.companyId === 'company-1' || !u.companyId) : u.companyId === companyId,
  );
  if (scoped.length === 0) return [];

  const userIds = scoped.map((u: any) => u.id);
  const { data: agents } = await supabase.from('linkedin_agent').select('id,userId').in('userId', userIds);
  if (!agents || agents.length === 0) return [];

  const nameByUserId = new Map(scoped.map((u: any) => [u.id, u.name]));

  return Promise.all(
    agents.map(async (agent: any) => {
      const dash = await getAgentDashboard(agent.id);
      return {
        agentId: agent.id,
        userId: agent.userId,
        name: nameByUserId.get(agent.userId) || '—',
        targets: dash.targets,
        ...dash.stats,
        kpis: dash.kpis,
        alerts: dash.alerts,
        followUpCount: dash.followUpRequired.length,
      };
    }),
  );
}

export async function setTargets(agentId: string, targets: Record<string, any>) {
  const { data: agent } = await supabase.from('linkedin_agent').select('targets').eq('id', agentId).single();
  const merged = { ...(agent?.targets || {}), ...targets };
  const { data, error } = await supabase.from('linkedin_agent').update({ targets: merged }).eq('id', agentId).select().single();
  if (error) throw new Error(error.message);
  return data;
}
