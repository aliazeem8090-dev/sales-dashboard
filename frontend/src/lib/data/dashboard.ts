import { supabase } from '../supabase';

type ProposalRow = {
  id: string;
  repId: string;
  jobId: string;
  status: string;
  submittedAt: string;
  hiredAt: string | null;
  connectsUsed: number | null;
  contractValue: number | null;
  profileUsedId: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDaysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 10000) / 100 : 0);

async function getCompanyRepIds(companyId: string | null): Promise<string[]> {
  let q = supabase.from('profiles').select('repId').eq('role', 'REP').not('repId', 'is', null);
  if (companyId) q = q.eq('companyId', companyId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => r.repId).filter(Boolean);
}

async function fetchProposals(repIds: string[], opts: { days?: number; status?: string } = {}): Promise<ProposalRow[]> {
  if (repIds.length === 0) return [];
  let q = supabase.from('proposal').select('id,repId,jobId,status,submittedAt,hiredAt,connectsUsed,contractValue,profileUsedId').in('repId', repIds);
  if (opts.days) q = q.gte('submittedAt', isoDaysAgo(opts.days));
  if (opts.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as ProposalRow[];
}

export async function getTeamOverview(companyId: string | null, days?: number) {
  const repIds = await getCompanyRepIds(companyId);
  if (repIds.length === 0) {
    return { totalProposals: 0, totalViewed: 0, totalReplied: 0, totalInterviews: 0, totalHires: 0, totalConnectsUsed: 0, totalEarnings: 0, viewRate: 0, replyRate: 0, interviewRate: 0, hireRate: 0 };
  }
  const proposals = await fetchProposals(repIds, { days });

  const totalProposals = proposals.length;
  const totalViewed = proposals.filter((p) => p.status === 'VIEWED').length;
  const totalReplied = proposals.filter((p) => p.status === 'REPLIED').length;
  const totalInterviews = proposals.filter((p) => p.status === 'INTERVIEW').length;
  const totalHires = proposals.filter((p) => p.status === 'HIRED').length;
  const totalConnectsUsed = proposals.reduce((s, p) => s + (p.connectsUsed || 0), 0);
  const totalEarnings = proposals.reduce((s, p) => s + (p.contractValue || 0), 0);

  return {
    totalProposals, totalViewed, totalReplied, totalInterviews, totalHires, totalConnectsUsed, totalEarnings,
    viewRate: pct(totalViewed, totalProposals),
    replyRate: pct(totalReplied, totalProposals),
    interviewRate: pct(totalInterviews, totalProposals),
    hireRate: pct(totalHires, totalProposals),
  };
}

export async function getRepPerformance(repId: string, days?: number) {
  const proposals = await fetchProposals([repId], { days });
  proposals.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const total = proposals.length;
  const viewed = proposals.filter((p) => ['VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
  const replied = proposals.filter((p) => ['REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
  const interviews = proposals.filter((p) => ['INTERVIEW', 'HIRED'].includes(p.status)).length;
  const hires = proposals.filter((p) => p.status === 'HIRED').length;
  const connectsUsed = proposals.reduce((s, p) => s + (p.connectsUsed || 0), 0);
  const totalEarnings = proposals.reduce((s, p) => s + (p.contractValue || 0), 0);

  const { data: rep } = await supabase.from('rep').select('currentConnects,targets').eq('id', repId).single();

  const thirtyDaysAgo = isoDaysAgo(30);
  const { count: recentLogs } = await supabase
    .from('activity_log')
    .select('id', { count: 'exact', head: true })
    .eq('repId', repId)
    .gte('date', thirtyDaysAgo.slice(0, 10));
  const consistencyScore = Math.min(100, Math.round(((recentLogs || 0) / 20) * 100));

  const { data: lastLog } = await supabase.from('activity_log').select('date').eq('repId', repId).order('date', { ascending: false }).limit(1).maybeSingle();

  const sevenDaysAgo = isoDaysAgo(7);
  const proposalsThisWeek = proposals.filter((p) => p.submittedAt >= sevenDaysAgo).length;

  const earningsThisMonth = proposals
    .filter((p) => p.status === 'HIRED' && p.hiredAt && p.hiredAt >= thirtyDaysAgo)
    .reduce((s, p) => s + (p.contractValue || 0), 0);

  return {
    repId,
    totalProposals: total,
    viewed, replied, interviews, hires,
    connectsUsed,
    currentConnects: rep?.currentConnects || 0,
    targets: rep?.targets || {},
    viewRate: pct(viewed, total),
    replyRate: pct(replied, total),
    interviewRate: pct(interviews, total),
    hireRate: pct(hires, total),
    connectEfficiency: connectsUsed > 0 ? Math.round((replied / connectsUsed) * 100) / 100 : 0,
    consistencyScore,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    earningsThisMonth: Math.round(earningsThisMonth * 100) / 100,
    lastActivityDate: lastLog?.date || null,
    lastProposalDate: proposals[0]?.submittedAt || null,
    proposalsThisWeek,
    recentProposals: proposals.slice(0, 5),
  };
}

export async function getAllRepsPerformance(companyId: string | null, days?: number) {
  let q = supabase.from('profiles').select('id,name,repId').eq('role', 'REP');
  if (companyId) q = q.eq('companyId', companyId);
  const { data: users, error } = await q;
  if (error) throw new Error(error.message);

  return Promise.all(
    (users || []).map(async (user: any) => {
      if (!user.repId) {
        return { name: user.name, userId: user.id, repId: null, totalProposals: 0, hires: 0, hireRate: 0, replyRate: 0, consistencyScore: 0 };
      }
      const performance = await getRepPerformance(user.repId, days);
      return { name: user.name, userId: user.id, ...performance };
    }),
  );
}

export async function getNicheStats(companyId: string | null) {
  const repIds = await getCompanyRepIds(companyId);
  if (repIds.length === 0) return [];

  const { data: proposals, error } = await supabase.from('proposal').select('status,profileUsedId').in('repId', repIds);
  if (error) throw new Error(error.message);

  const profileIds = Array.from(new Set((proposals || []).map((p: any) => p.profileUsedId).filter(Boolean)));
  const nicheByProfile = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase.from('upwork_profile').select('id,niche').in('id', profileIds);
    for (const p of profiles || []) nicheByProfile.set(p.id, p.niche || 'General');
  }

  const niches: Record<string, { sent: number; hired: number }> = {};
  for (const p of proposals || []) {
    const niche = (p.profileUsedId && nicheByProfile.get(p.profileUsedId)) || 'General';
    if (!niches[niche]) niches[niche] = { sent: 0, hired: 0 };
    niches[niche].sent++;
    if (p.status === 'HIRED') niches[niche].hired++;
  }
  return Object.entries(niches).map(([niche, stats]) => ({ niche, sent: stats.sent, hired: stats.hired, winRate: pct(stats.hired, stats.sent) }));
}

export async function getTeamTrends(companyId: string | null, days = 30) {
  const repIds = await getCompanyRepIds(companyId);
  if (repIds.length === 0) return [];

  const { data: proposals, error } = await supabase
    .from('proposal')
    .select('submittedAt')
    .in('repId', repIds)
    .gte('submittedAt', isoDaysAgo(days))
    .order('submittedAt', { ascending: true });
  if (error) throw new Error(error.message);

  const byDate: Record<string, number> = {};
  for (const p of proposals || []) {
    const key = p.submittedAt.slice(0, 10);
    byDate[key] = (byDate[key] || 0) + 1;
  }
  return Object.entries(byDate).map(([date, count]) => ({ date, proposals: count }));
}

export async function getDealDetail(companyId: string | null) {
  const repIds = await getCompanyRepIds(companyId);
  if (repIds.length === 0) return [];

  const { data: deals, error } = await supabase
    .from('proposal')
    .select('id,repId,contractValue,hiredAt,profileUsedId,jobId')
    .in('repId', repIds)
    .eq('status', 'HIRED')
    .order('hiredAt', { ascending: false });
  if (error) throw new Error(error.message);

  const repIdsUsed = Array.from(new Set((deals || []).map((d: any) => d.repId)));
  const profileIds = Array.from(new Set((deals || []).map((d: any) => d.profileUsedId).filter(Boolean)));
  const jobIds = Array.from(new Set((deals || []).map((d: any) => d.jobId).filter(Boolean)));

  const [{ data: reps }, { data: profiles }, { data: jobs }] = await Promise.all([
    repIdsUsed.length ? supabase.from('rep').select('id,userId').in('id', repIdsUsed) : Promise.resolve({ data: [] as any[] }),
    profileIds.length ? supabase.from('upwork_profile').select('id,niche,title').in('id', profileIds) : Promise.resolve({ data: [] as any[] }),
    jobIds.length ? supabase.from('job').select('id,title').in('id', jobIds) : Promise.resolve({ data: [] as any[] }),
  ]);

  const userIds = Array.from(new Set((reps || []).map((r: any) => r.userId)));
  const { data: repUsers } = userIds.length
    ? await supabase.from('profiles').select('id,name').in('id', userIds)
    : { data: [] as any[] };

  const repNameByRepId = new Map<string, string>();
  for (const r of reps || []) {
    const name = (repUsers || []).find((u: any) => u.id === r.userId)?.name;
    if (name) repNameByRepId.set(r.id, name);
  }
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
  const jobById = new Map((jobs || []).map((j: any) => [j.id, j]));

  return (deals || []).map((d: any) => ({
    id: d.id,
    repId: d.repId,
    repName: repNameByRepId.get(d.repId) || d.repId,
    profileNiche: profileById.get(d.profileUsedId)?.niche || '—',
    profileTitle: profileById.get(d.profileUsedId)?.title || '—',
    jobTitle: jobById.get(d.jobId)?.title || '—',
    contractValue: d.contractValue || null,
    hiredAt: d.hiredAt,
  }));
}

export async function getWeeklySummary(companyId: string | null) {
  const repIds = await getCompanyRepIds(companyId);
  if (repIds.length === 0) return { thisWeek: 0, lastWeek: 0, change: 0 };

  const now = new Date();
  const sevenDaysAgo = isoDaysAgo(7);
  const fourteenDaysAgo = isoDaysAgo(14);

  const [{ count: thisWeek }, { count: lastWeek }] = await Promise.all([
    supabase.from('proposal').select('id', { count: 'exact', head: true }).in('repId', repIds).gte('submittedAt', sevenDaysAgo).lte('submittedAt', now.toISOString()),
    supabase.from('proposal').select('id', { count: 'exact', head: true }).in('repId', repIds).gte('submittedAt', fourteenDaysAgo).lt('submittedAt', sevenDaysAgo),
  ]);

  return { thisWeek: thisWeek || 0, lastWeek: lastWeek || 0, change: (thisWeek || 0) - (lastWeek || 0) };
}

export async function getLeaderboard(companyId: string | null, days?: number) {
  const reps = await getAllRepsPerformance(companyId, days);
  return [...reps]
    .sort((a: any, b: any) => (b.hireRate + b.replyRate * 0.3) - (a.hireRate + a.replyRate * 0.3))
    .map((rep, index) => ({ rank: index + 1, ...rep }));
}

export async function getRepSelfDashboard(userId: string) {
  const { data: user } = await supabase.from('profiles').select('id,name,repId').eq('id', userId).single();
  const repId = user?.repId;
  if (!repId) return null;

  const { data: rep } = await supabase.from('rep').select('currentConnects,weeklyGoals,targets').eq('id', repId).single();

  const { data: proposalsRaw, error } = await supabase
    .from('proposal')
    .select('id,status,submittedAt,hiredAt,connectsUsed,contractValue,jobId')
    .eq('repId', repId)
    .order('submittedAt', { ascending: false });
  if (error) throw new Error(error.message);
  const proposals = proposalsRaw || [];

  const jobIds = Array.from(new Set(proposals.map((p: any) => p.jobId).filter(Boolean)));
  const { data: jobs } = jobIds.length ? await supabase.from('job').select('id,title').in('id', jobIds) : { data: [] as any[] };
  const jobById = new Map((jobs || []).map((j: any) => [j.id, j]));

  const total = proposals.length;
  const viewed = proposals.filter((p: any) => ['VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
  const replied = proposals.filter((p: any) => ['REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
  const interviews = proposals.filter((p: any) => ['INTERVIEW', 'HIRED'].includes(p.status)).length;
  const hires = proposals.filter((p: any) => p.status === 'HIRED').length;
  const lost = proposals.filter((p: any) => p.status === 'LOST' || p.status === 'REJECTED').length;
  const connectsUsed = proposals.reduce((s: number, p: any) => s + (p.connectsUsed || 0), 0);
  const totalEarnings = proposals.reduce((s: number, p: any) => s + (p.contractValue || 0), 0);

  const thirtyDaysAgo = isoDaysAgo(30);
  const { count: recentLogs } = await supabase
    .from('activity_log')
    .select('id', { count: 'exact', head: true })
    .eq('repId', repId)
    .gte('date', thirtyDaysAgo.slice(0, 10));
  const consistencyScore = Math.min(100, Math.round(((recentLogs || 0) / 20) * 100));

  const { data: lastLog } = await supabase.from('activity_log').select('date').eq('repId', repId).order('date', { ascending: false }).limit(1).maybeSingle();

  const sevenDaysAgo = isoDaysAgo(7);
  const proposalsThisWeek = proposals.filter((p: any) => p.submittedAt >= sevenDaysAgo).length;

  const earningsThisMonth = proposals
    .filter((p: any) => p.status === 'HIRED' && p.hiredAt && p.hiredAt >= thirtyDaysAgo)
    .reduce((s: number, p: any) => s + (p.contractValue || 0), 0);

  const { data: assignments } = await supabase.from('bidder_assignment').select('profileId').eq('bidderId', userId).eq('isActive', true);
  const assignmentProfileIds = (assignments || []).map((a: any) => a.profileId);
  const { data: assignedProfiles } = assignmentProfileIds.length
    ? await supabase.from('upwork_profile').select('id,title,niche').in('id', assignmentProfileIds)
    : { data: [] as any[] };

  return {
    repId, userId,
    name: user?.name,
    currentConnects: rep?.currentConnects || 0,
    weeklyGoals: rep?.weeklyGoals,
    targets: rep?.targets,
    totalProposals: total,
    viewed, replied, interviews, hires, lost,
    connectsUsed,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    viewRate: pct(viewed, total),
    replyRate: pct(replied, total),
    interviewRate: pct(interviews, total),
    hireRate: pct(hires, total),
    consistencyScore,
    lastActivityDate: lastLog?.date || null,
    proposalsThisWeek,
    earningsThisMonth: Math.round(earningsThisMonth * 100) / 100,
    assignedProfiles: (assignedProfiles || []).map((p: any) => ({ id: p.id, title: p.title, niche: p.niche })),
    recentProposals: proposals.slice(0, 5).map((p: any) => ({ ...p, job: jobById.get(p.jobId) || null })),
  };
}

export async function getBidderReport(repId: string) {
  const { data: rep } = await supabase.from('rep').select('id,userId,currentConnects,weeklyGoals,targets').eq('id', repId).single();
  const { data: user } = rep?.userId ? await supabase.from('profiles').select('id,name,email').eq('id', rep.userId).single() : { data: null as any };

  const { data: assignments } = user?.id
    ? await supabase.from('bidder_assignment').select('profileId').eq('bidderId', user.id).eq('isActive', true)
    : { data: [] as any[] };
  const assignmentProfileIds = (assignments || []).map((a: any) => a.profileId);
  const { data: assignedProfiles } = assignmentProfileIds.length
    ? await supabase.from('upwork_profile').select('id,title,niche').in('id', assignmentProfileIds)
    : { data: [] as any[] };
  const profileById = new Map((assignedProfiles || []).map((p: any) => [p.id, p]));

  const { data: proposalsRaw } = await supabase
    .from('proposal')
    .select('id,status,submittedAt,connectsUsed,profileUsedId')
    .eq('repId', repId)
    .order('submittedAt', { ascending: false });
  const proposals = proposalsRaw || [];

  const total = proposals.length;
  const viewed = proposals.filter((p: any) => ['VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
  const replied = proposals.filter((p: any) => ['REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
  const interviews = proposals.filter((p: any) => ['INTERVIEW', 'HIRED'].includes(p.status)).length;
  const hires = proposals.filter((p: any) => p.status === 'HIRED').length;
  const connectsUsed = proposals.reduce((s: number, p: any) => s + (p.connectsUsed || 0), 0);

  const thirtyDaysAgo = isoDaysAgo(30);
  const { data: activityLogs } = await supabase
    .from('activity_log')
    .select('date,proposalsSent')
    .eq('repId', repId)
    .gte('date', thirtyDaysAgo.slice(0, 10))
    .order('date', { ascending: false });
  const { count: totalLogs } = await supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('repId', repId);
  const avgProposalsPerDay = (activityLogs || []).length > 0
    ? Math.round(((activityLogs || []).reduce((s, l: any) => s + (l.proposalsSent || 0), 0) / (activityLogs || []).length) * 10) / 10
    : 0;
  const consistencyScore = Math.min(100, Math.round(((activityLogs || []).length / 20) * 100));

  const profileBreakdown = assignmentProfileIds.map((profileId: string) => {
    const profileProposals = proposals.filter((p: any) => p.profileUsedId === profileId);
    const ph = profileProposals.filter((p: any) => p.status === 'HIRED').length;
    const profile = profileById.get(profileId);
    return {
      profileId,
      profileTitle: profile?.title || 'Unknown',
      niche: profile?.niche || '',
      proposalCount: profileProposals.length,
      hires: ph,
      hireRate: pct(ph, profileProposals.length),
    };
  });

  return {
    bidder: {
      id: user?.id, name: user?.name, email: user?.email, repId,
      currentConnects: rep?.currentConnects || 0,
      weeklyGoals: rep?.weeklyGoals,
      targets: rep?.targets,
    },
    assignedProfiles: assignmentProfileIds.map((id: string) => ({ id, title: profileById.get(id)?.title, niche: profileById.get(id)?.niche })),
    stats: {
      totalProposals: total, viewed, replied, interviews, hires, connectsUsed,
      viewRate: pct(viewed, total), replyRate: pct(replied, total), interviewRate: pct(interviews, total), hireRate: pct(hires, total),
    },
    activity: { totalLogsAllTime: totalLogs || 0, logsLast30Days: (activityLogs || []).length, avgProposalsPerDay, consistencyScore },
    profileBreakdown,
    recentProposals: proposals.slice(0, 10),
  };
}
