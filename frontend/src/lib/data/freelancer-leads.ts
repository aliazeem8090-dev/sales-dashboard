import { supabase } from '../supabase';

export async function findByAgent(agentId: string) {
  const { data, error } = await supabase.from('freelancer_lead').select('*').eq('agentId', agentId).order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function create(agentId: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('freelancer_lead').insert({ status: 'NEW', ...patch, agentId }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('freelancer_lead').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string) {
  const { error } = await supabase.from('freelancer_lead').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
