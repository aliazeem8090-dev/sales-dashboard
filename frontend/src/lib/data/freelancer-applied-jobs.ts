import { supabase } from '../supabase';

export async function findByAgent(agentId: string) {
  const { data, error } = await supabase.from('freelancer_applied_job').select('*').eq('agentId', agentId).order('appliedAt', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function create(agentId: string, data: { url: string; title?: string }) {
  const { data: created, error } = await supabase.from('freelancer_applied_job').insert({ agentId, url: data.url, title: data.title }).select().single();
  if (error) throw new Error(error.message);
  return created;
}

export async function remove(id: string) {
  const { error } = await supabase.from('freelancer_applied_job').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
