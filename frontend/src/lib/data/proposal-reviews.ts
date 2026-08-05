import { supabase } from '../supabase';

export async function create(data: Record<string, unknown>) {
  const { data: created, error } = await supabase.from('proposal_review').insert(data).select().single();
  if (error) throw new Error(error.message);
  return created;
}

export async function findByProposal(proposalId: string) {
  const { data, error } = await supabase.from('proposal_review').select('*').eq('proposalId', proposalId).order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function findLatest(proposalId: string) {
  const { data, error } = await supabase.from('proposal_review').select('*').eq('proposalId', proposalId).order('createdAt', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
