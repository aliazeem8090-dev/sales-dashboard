import { supabase } from '../supabase';

async function hydrateUsers(reps: any[]) {
  const userIds = Array.from(new Set(reps.map((r) => r.userId)));
  const { data: users } = userIds.length ? await supabase.from('profiles').select('id,name,email,companyId').in('id', userIds) : { data: [] as any[] };
  const userById = new Map((users || []).map((u: any) => [u.id, u]));
  return reps.map((r) => ({ ...r, user: userById.get(r.userId) || null }));
}

export async function findAll(companyId?: string | null) {
  const company = companyId || 'company-1';
  const { data: reps, error } = await supabase.from('rep').select('*');
  if (error) throw new Error(error.message);
  const hydrated = await hydrateUsers(reps || []);
  return hydrated.filter((r: any) => {
    if (company === 'company-1') return !r.user || r.user.companyId === 'company-1' || !r.user.companyId;
    return r.user?.companyId === company;
  });
}

export async function findOne(id: string) {
  const { data, error } = await supabase.from('rep').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  const [hydrated] = await hydrateUsers([data]);
  return hydrated;
}

export async function findByUserId(userId: string) {
  const { data, error } = await supabase.from('rep').select('*').eq('userId', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [hydrated] = await hydrateUsers([data]);
  return hydrated;
}

export async function create(data: Record<string, unknown>) {
  const { data: created, error } = await supabase.from('rep').insert(data).select().single();
  if (error) throw new Error(error.message);
  return created;
}

export async function update(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('rep').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateConnects(id: string, currentConnects: number) {
  return update(id, { currentConnects });
}
