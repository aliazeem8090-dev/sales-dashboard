import { supabase } from '../supabase';

async function hydrateUser(agents: any[]) {
  const userIds = Array.from(new Set(agents.map((a) => a.userId)));
  const { data: users } = userIds.length ? await supabase.from('profiles').select('id,name,email').in('id', userIds) : { data: [] as any[] };
  const userById = new Map((users || []).map((u: any) => [u.id, u]));
  return agents.map((a) => ({ ...a, user: userById.get(a.userId) || null }));
}

export async function findAll() {
  const { data, error } = await supabase.from('linkedin_agent').select('*');
  if (error) throw new Error(error.message);
  return hydrateUser(data || []);
}

export async function findOne(id: string) {
  const { data, error } = await supabase.from('linkedin_agent').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  const [hydrated] = await hydrateUser([data]);
  return hydrated;
}

export async function findByUserId(userId: string) {
  const { data, error } = await supabase.from('linkedin_agent').select('*').eq('userId', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [hydrated] = await hydrateUser([data]);
  return hydrated;
}

export async function update(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('linkedin_agent').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string) {
  const { error } = await supabase.from('linkedin_agent').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
