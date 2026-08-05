import { supabase } from '../supabase';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayLog(repId: string) {
  const { data, error } = await supabase.from('activity_log').select('*').eq('repId', repId).eq('date', todayStr()).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateLog(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('activity_log').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function create(data: Record<string, unknown>) {
  const { data: created, error } = await supabase.from('activity_log').insert(data).select().single();
  if (error) throw new Error(error.message);
  return created;
}

export async function findByRep(repId: string, startDate?: string, endDate?: string) {
  let q = supabase.from('activity_log').select('*').eq('repId', repId).order('date', { ascending: false });
  if (startDate && endDate) q = q.gte('date', startDate).lte('date', endDate);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}
