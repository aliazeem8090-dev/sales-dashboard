import { supabase } from '../supabase';

export async function findOrCreate(data: { upworkJobUrl: string; title: string; description?: string; clientBudget?: string; category?: string }) {
  const { data: existing } = await supabase.from('job').select('*').eq('upworkJobUrl', data.upworkJobUrl).maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await supabase.from('job').insert(data).select().single();
  if (error) throw new Error(error.message);
  return created;
}

export async function findOne(id: string) {
  const { data, error } = await supabase.from('job').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('job').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function findAll() {
  const { data, error } = await supabase.from('job').select('*').order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
