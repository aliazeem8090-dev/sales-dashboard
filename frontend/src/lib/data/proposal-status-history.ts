import { supabase } from '../supabase';

export async function log(proposalId: string, fromStatus: string | null, toStatus: string, changedBy: string, notes?: string) {
  const { error } = await supabase.from('proposal_status_history').insert({ proposalId, fromStatus, toStatus, changedBy, notes });
  if (error) throw new Error(error.message);
}

export async function findByProposal(proposalId: string) {
  const { data, error } = await supabase.from('proposal_status_history').select('*').eq('proposalId', proposalId).order('changedAt', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}
