import { supabase } from '../supabase';

export async function findAll(companyId?: string | null) {
  let q = supabase.from('upwork_profile').select('*');
  if (companyId) q = q.eq('companyId', companyId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function findOne(id: string) {
  const { data, error } = await supabase.from('upwork_profile').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function create(data: Record<string, unknown>) {
  const { data: created, error } = await supabase.from('upwork_profile').insert(data).select().single();
  if (error) throw new Error(error.message);
  return created;
}

export async function update(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('upwork_profile').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
