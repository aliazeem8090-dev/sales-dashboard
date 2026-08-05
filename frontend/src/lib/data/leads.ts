import { supabase } from '../supabase';

export async function create(data: Record<string, unknown>) {
  const { data: created, error } = await supabase.from('lead').insert(data).select().single();
  if (error) throw new Error(error.message);
  return created;
}

export async function findByCompany(companyId: string) {
  const { data: leads, error } = await supabase.from('lead').select('*').eq('companyId', companyId).order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);

  const repIds = Array.from(new Set((leads || []).map((l: any) => l.repId).filter(Boolean)));
  const { data: reps } = repIds.length ? await supabase.from('rep').select('id,userId').in('id', repIds) : { data: [] as any[] };
  const userIds = Array.from(new Set((reps || []).map((r: any) => r.userId)));
  const { data: users } = userIds.length ? await supabase.from('profiles').select('id,name').in('id', userIds) : { data: [] as any[] };
  const userById = new Map((users || []).map((u: any) => [u.id, u]));
  const repById = new Map((reps || []).map((r: any) => [r.id, { ...r, user: userById.get(r.userId) || null }]));

  return (leads || []).map((l: any) => ({ ...l, rep: repById.get(l.repId) || null }));
}

export async function findByUserId(userId: string) {
  const { data: rep } = await supabase.from('rep').select('id').eq('userId', userId).maybeSingle();
  if (!rep) return [];
  const { data, error } = await supabase.from('lead').select('*').eq('repId', rep.id).order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function update(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('lead').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
