import { supabase } from '../supabase';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function findByAgent(agentId: string, days = 30) {
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase.from('freelancer_daily_log').select('*').eq('agentId', agentId).gte('date', from).order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getTodayLog(agentId: string) {
  const { data, error } = await supabase.from('freelancer_daily_log').select('*').eq('agentId', agentId).eq('date', todayStr()).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertToday(agentId: string, patch: Record<string, unknown>) {
  const today = todayStr();
  const existing = await getTodayLog(agentId);
  if (existing) {
    const { data, error } = await supabase.from('freelancer_daily_log').update(patch).eq('id', existing.id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase.from('freelancer_daily_log').insert({ agentId, date: today, ...patch }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addManagerComment(agentId: string, date: string, comment: string) {
  const { data: log, error: findErr } = await supabase.from('freelancer_daily_log').select('id').eq('agentId', agentId).eq('date', date).maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (!log) return null;
  const { data, error } = await supabase.from('freelancer_daily_log').update({ managerComment: comment }).eq('id', log.id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
