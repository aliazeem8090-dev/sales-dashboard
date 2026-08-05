import { supabase } from '../supabase';

async function hydrateProfiles(rows: any[]) {
  const profileIds = Array.from(new Set(rows.map((r) => r.profileId)));
  const { data: profiles } = profileIds.length ? await supabase.from('upwork_profile').select('*').in('id', profileIds) : { data: [] as any[] };
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
  return rows.map((r) => ({ ...r, profile: profileById.get(r.profileId) || null }));
}

export async function getByBidder(bidderId: string) {
  const { data, error } = await supabase.from('bidder_assignment').select('*').eq('bidderId', bidderId).eq('isActive', true);
  if (error) throw new Error(error.message);
  return hydrateProfiles(data || []);
}

export async function getByProfile(profileId: string) {
  const { data, error } = await supabase.from('bidder_assignment').select('*').eq('profileId', profileId).eq('isActive', true);
  if (error) throw new Error(error.message);

  const bidderIds = Array.from(new Set((data || []).map((r: any) => r.bidderId)));
  const { data: bidders } = bidderIds.length ? await supabase.from('profiles').select('id,name,email').in('id', bidderIds) : { data: [] as any[] };
  const bidderById = new Map((bidders || []).map((b: any) => [b.id, b]));
  return (data || []).map((r: any) => ({ ...r, bidder: bidderById.get(r.bidderId) || null }));
}

export async function getAllAssignments(companyId?: string | null) {
  const { data, error } = await supabase.from('bidder_assignment').select('*').eq('isActive', true).order('assignedAt', { ascending: false });
  if (error) throw new Error(error.message);
  const withProfiles = await hydrateProfiles(data || []);

  const bidderIds = Array.from(new Set(withProfiles.map((r: any) => r.bidderId)));
  const { data: bidders } = bidderIds.length ? await supabase.from('profiles').select('id,name,email,companyId,repId').in('id', bidderIds) : { data: [] as any[] };
  const bidderById = new Map((bidders || []).map((b: any) => [b.id, b]));
  const withBidders = withProfiles.map((r: any) => ({ ...r, bidder: bidderById.get(r.bidderId) || null }));

  if (!companyId) return withBidders;
  return withBidders.filter((r: any) => r.bidder?.companyId === companyId);
}

export async function assign(bidderId: string, profileId: string, assignedBy: string) {
  const { data: existing } = await supabase.from('bidder_assignment').select('*').eq('bidderId', bidderId).eq('profileId', profileId).maybeSingle();
  if (existing) {
    const { data, error } = await supabase.from('bidder_assignment').update({ isActive: true, assignedBy }).eq('id', existing.id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase.from('bidder_assignment').insert({ bidderId, profileId, assignedBy }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function unassign(bidderId: string, profileId: string) {
  const { data: existing } = await supabase.from('bidder_assignment').select('id').eq('bidderId', bidderId).eq('profileId', profileId).maybeSingle();
  if (!existing) return null;
  const { data, error } = await supabase.from('bidder_assignment').update({ isActive: false }).eq('id', existing.id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
