import { supabase } from '../supabase';
import * as statusHistory from './proposal-status-history';
import * as activityLogs from './activity-logs';

async function hydrate(proposals: any[], opts: { withRep?: boolean } = {}) {
  if (proposals.length === 0) return [];
  const jobIds = Array.from(new Set(proposals.map((p) => p.jobId).filter(Boolean)));
  const profileIds = Array.from(new Set(proposals.map((p) => p.profileUsedId).filter(Boolean)));
  const repIds = Array.from(new Set(proposals.map((p) => p.repId).filter(Boolean)));

  const [{ data: jobs }, { data: profiles }, repsResult] = await Promise.all([
    jobIds.length ? supabase.from('job').select('*').in('id', jobIds) : Promise.resolve({ data: [] as any[] }),
    profileIds.length ? supabase.from('upwork_profile').select('*').in('id', profileIds) : Promise.resolve({ data: [] as any[] }),
    opts.withRep && repIds.length ? supabase.from('rep').select('*').in('id', repIds) : Promise.resolve({ data: [] as any[] }),
  ]);

  const jobById = new Map((jobs || []).map((j: any) => [j.id, j]));
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

  let repById = new Map<string, any>();
  if (opts.withRep) {
    const reps = repsResult.data || [];
    const userIds = Array.from(new Set(reps.map((r: any) => r.userId)));
    const { data: users } = userIds.length ? await supabase.from('profiles').select('id,name').in('id', userIds) : { data: [] as any[] };
    const userById = new Map((users || []).map((u: any) => [u.id, u]));
    repById = new Map(reps.map((r: any) => [r.id, { ...r, user: userById.get(r.userId) || null }]));
  }

  return proposals.map((p) => ({
    ...p,
    job: jobById.get(p.jobId) || null,
    profileUsed: p.profileUsedId ? profileById.get(p.profileUsedId) || null : null,
    ...(opts.withRep ? { rep: repById.get(p.repId) || null } : {}),
  }));
}

export async function findAll(filters: { status?: string; companyId?: string } = {}) {
  let repIds: string[] | null = null;
  if (filters.companyId) {
    const { data: reps, error } = await supabase.from('profiles').select('repId').eq('role', 'REP').eq('companyId', filters.companyId).not('repId', 'is', null);
    if (error) throw new Error(error.message);
    repIds = (reps || []).map((r: any) => r.repId);
    if (repIds.length === 0) return [];
  }
  let q = supabase.from('proposal').select('*').order('submittedAt', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  if (repIds) q = q.in('repId', repIds);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return hydrate(data || [], { withRep: true });
}

export async function findByRepWithFilters(
  repId: string,
  filters: { status?: string; startDate?: string; endDate?: string; profileId?: string } = {},
) {
  if (!repId) return [];
  let q = supabase.from('proposal').select('*').eq('repId', repId).order('submittedAt', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.profileId) q = q.eq('profileUsedId', filters.profileId);
  if (filters.startDate && filters.endDate) {
    q = q.gte('submittedAt', new Date(filters.startDate).toISOString()).lte('submittedAt', new Date(filters.endDate).toISOString());
  } else if (filters.startDate) {
    q = q.gte('submittedAt', new Date(filters.startDate).toISOString());
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return hydrate(data || [], { withRep: true });
}

export async function findOne(id: string) {
  const { data, error } = await supabase.from('proposal').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [hydrated] = await hydrate([data]);
  const { data: reviews } = await supabase.from('proposal_review').select('*').eq('proposalId', id);
  return { ...hydrated, reviews: reviews || [] };
}

export async function create(
  proposalData: Record<string, unknown>,
  createdBy?: string,
  context: { companyId?: string; repEmail?: string; role?: string } = {},
) {
  const { data: saved, error } = await supabase.from('proposal').insert(proposalData).select().single();
  if (error) throw new Error(error.message);

  await statusHistory.log(saved.id, null, saved.status || 'SENT', createdBy || saved.repId);

  const repCompanyId = (context.companyId || 'company-1').trim().toLowerCase();
  const creatorRole = (context.role || '').trim().toLowerCase();
  if (repCompanyId === 'company-1' && creatorRole === 'rep' && saved.jobId) {
    const { data: job } = await supabase.from('job').select('upworkJobUrl,title').eq('id', saved.jobId).maybeSingle();
    if (job?.upworkJobUrl) {
      const { error: notifyErr } = await supabase.rpc('notify_company_managers', {
        p_job_url: job.upworkJobUrl,
        p_job_title: job.title || 'Untitled Job',
        p_rep_name: context.repEmail || 'Company 1 Rep',
        p_source_company_id: repCompanyId,
        p_target_company_id: 'company-2',
      });
      if (notifyErr) console.error('notify_company_managers failed:', notifyErr.message);
    }
  }

  return saved;
}

export async function update(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('proposal').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  return findOne(id);
}

export async function updateStatus(id: string, status: string, changedBy?: string) {
  const { data: existing } = await supabase.from('proposal').select('*').eq('id', id).maybeSingle();
  const fromStatus = existing?.status ?? null;

  const timestamps: Record<string, unknown> = { status };
  const now = new Date().toISOString();
  if (status === 'VIEWED') timestamps.viewedAt = now;
  if (status === 'REPLIED') timestamps.repliedAt = now;
  if (status === 'INTERVIEW') timestamps.interviewAt = now;
  if (status === 'HIRED') timestamps.hiredAt = now;

  const { error } = await supabase.from('proposal').update(timestamps).eq('id', id);
  if (error) throw new Error(error.message);

  await statusHistory.log(id, fromStatus, status, changedBy || existing?.repId || id);

  const repId = existing?.repId;
  if (repId) {
    const existingLog = await activityLogs.getTodayLog(repId);
    if (existingLog) {
      const updates: Record<string, number> = {};
      if (status === 'HIRED' && fromStatus !== 'HIRED') updates.dealsClosed = (existingLog.dealsClosed || 0) + 1;
      if (
        (status === 'REPLIED' || status === 'INTERVIEW') &&
        !['REPLIED', 'INTERVIEW', 'HIRED'].includes(fromStatus)
      ) {
        updates.leadsGenerated = (existingLog.leadsGenerated || 0) + 1;
      }
      if (Object.keys(updates).length > 0) await activityLogs.updateLog(existingLog.id, updates);
    }
  }

  return findOne(id);
}

export async function getStatusHistory(proposalId: string) {
  return statusHistory.findByProposal(proposalId);
}

export async function getProposalFunnelStats(repId: string) {
  const { data, error } = await supabase.from('proposal').select('status').eq('repId', repId);
  if (error) throw new Error(error.message);
  const proposals = data || [];
  return {
    sent: proposals.length,
    viewed: proposals.filter((p: any) => ['VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length,
    replied: proposals.filter((p: any) => ['REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length,
    interview: proposals.filter((p: any) => ['INTERVIEW', 'HIRED'].includes(p.status)).length,
    hired: proposals.filter((p: any) => p.status === 'HIRED').length,
    lost: proposals.filter((p: any) => p.status === 'LOST' || p.status === 'REJECTED').length,
  };
}

export async function remove(id: string) {
  const { error } = await supabase.from('proposal').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
