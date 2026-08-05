import { supabase } from '../supabase';

export async function findAll() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,email,role,companyId,activeStatus,repId,agentId,freelancerAgentId')
    .in('role', ['REP', 'LINKEDIN_AGENT', 'FREELANCER_AGENT']);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateRole(userId: string, role: string) {
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', userId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function authedFetch(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Request failed.');
  return body;
}

export async function create(data: { name: string; email: string; password: string; role: string; companyId?: string }) {
  return authedFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function remove(userId: string) {
  return authedFetch(`/api/admin/users?id=${encodeURIComponent(userId)}`, { method: 'DELETE' });
}
