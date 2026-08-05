import { supabase } from '../supabase';

export async function findByAgent(agentId: string) {
  const { data, error } = await supabase.from('freelancer_job').select('*').eq('agentId', agentId).order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function create(agentId: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('freelancer_job').insert({ ...patch, agentId }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, patch: Record<string, any>) {
  const { data: job, error: findErr } = await supabase.from('freelancer_job').select('*').eq('id', id).single();
  if (findErr) throw new Error(findErr.message);

  const next = { ...patch };
  if (patch.status && patch.status !== job.status) {
    const now = new Date().toISOString();
    if (patch.status === 'APPLIED' && !job.appliedAt) next.appliedAt = now;
    if (patch.status === 'VIEWED' && !job.viewedAt) next.viewedAt = now;
    if (patch.status === 'REPLIED' && !job.repliedAt) next.repliedAt = now;
    if (patch.status === 'INTERVIEW' && !job.interviewAt) next.interviewAt = now;
    if (patch.status === 'HIRED' && !job.hiredAt) next.hiredAt = now;
    if (patch.status === 'LOST' && !job.lostAt) next.lostAt = now;
  }

  const { data, error } = await supabase.from('freelancer_job').update(next).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function markFollowUp(id: string) {
  const { data: job, error: findErr } = await supabase.from('freelancer_job').select('followUpCount').eq('id', id).single();
  if (findErr) throw new Error(findErr.message);
  const { data, error } = await supabase
    .from('freelancer_job')
    .update({ lastFollowUpAt: new Date().toISOString(), followUpCount: (job.followUpCount || 0) + 1 })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string) {
  const { error } = await supabase.from('freelancer_job').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getFollowUpRequired(agentId: string) {
  const cutoff = new Date(Date.now() - 4 * 86400000).toISOString();
  const followUpCutoff = new Date(Date.now() - 3 * 86400000).toISOString();
  const { data, error } = await supabase.from('freelancer_job').select('*').eq('agentId', agentId).in('status', ['APPLIED', 'VIEWED']).lt('appliedAt', cutoff);
  if (error) throw new Error(error.message);
  return (data || []).filter((j: any) => !j.lastFollowUpAt || j.lastFollowUpAt < followUpCutoff);
}
