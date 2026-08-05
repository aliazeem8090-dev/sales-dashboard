import { supabase } from '../supabase';

export async function findByAgent(agentId: string) {
  const { data, error } = await supabase.from('linkedin_lead').select('*').eq('agentId', agentId).order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function create(agentId: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('linkedin_lead').insert({ ...patch, agentId }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, patch: Record<string, any>) {
  const { data: lead, error: findErr } = await supabase.from('linkedin_lead').select('*').eq('id', id).single();
  if (findErr) throw new Error(findErr.message);

  const now = new Date().toISOString();
  const next = { ...patch };
  if (patch.status === 'CONTACTED' && !lead.contactedAt) next.contactedAt = now;
  if (patch.status === 'REPLIED' && !lead.repliedAt) next.repliedAt = now;
  if (patch.status === 'FOLLOWED_UP') next.lastFollowUpAt = now;
  if (patch.status === 'CONVERTED' && !lead.convertedAt) next.convertedAt = now;

  const { data, error } = await supabase.from('linkedin_lead').update(next).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string) {
  const { error } = await supabase.from('linkedin_lead').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getFollowUpRequired(agentId: string) {
  const cutoff = new Date(Date.now() - 4 * 86400000).toISOString();
  const { data, error } = await supabase.from('linkedin_lead').select('*').eq('agentId', agentId).eq('status', 'CONTACTED').lt('contactedAt', cutoff);
  if (error) throw new Error(error.message);
  return data || [];
}
