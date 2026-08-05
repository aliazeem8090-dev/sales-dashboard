import { supabase } from '../supabase';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function findByAgent(agentId: string, days = 30) {
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase.from('linkedin_daily_log').select('*').eq('agentId', agentId).gte('date', from).order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getTodayLog(agentId: string) {
  const { data, error } = await supabase.from('linkedin_daily_log').select('*').eq('agentId', agentId).eq('date', todayStr()).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertToday(agentId: string, patch: Record<string, unknown>) {
  const today = todayStr();
  const existing = await getTodayLog(agentId);
  if (existing) {
    const { data, error } = await supabase.from('linkedin_daily_log').update(patch).eq('id', existing.id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase.from('linkedin_daily_log').insert({ agentId, date: today, ...patch }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getMonthlyInMails(agentId: string) {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
  const from = d.toISOString().slice(0, 10);
  const { data, error } = await supabase.from('linkedin_daily_log').select('inMailsSent').eq('agentId', agentId).gte('date', from);
  if (error) throw new Error(error.message);
  return (data || []).reduce((s: number, l: any) => s + (l.inMailsSent || 0), 0);
}
