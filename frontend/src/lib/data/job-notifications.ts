import { supabase } from '../supabase';

function norm(v?: string | null) {
  return (v || '').trim().toLowerCase();
}

export async function findForUser(companyId: string, userId: string) {
  const { data, error } = await supabase.from('job_notification').select('*').order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);
  const nCompany = norm(companyId);
  return (data || []).filter((n: any) => norm(n.targetCompanyId) === nCompany && (n.targetUserId === userId || n.targetUserId === null));
}

export async function getUnreadCountForUser(companyId: string, userId: string) {
  const rows = await findForUser(companyId, userId);
  return rows.filter((n: any) => !n.isRead).length;
}

export async function markRead(id: string) {
  const { error } = await supabase.from('job_notification').update({ isRead: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllReadForUser(companyId: string, userId: string) {
  const rows = await findForUser(companyId, userId);
  const unreadIds = rows.filter((n: any) => !n.isRead).map((n: any) => n.id);
  if (unreadIds.length === 0) return;
  const { error } = await supabase.from('job_notification').update({ isRead: true }).in('id', unreadIds);
  if (error) throw new Error(error.message);
}
