import { supabase } from '../supabase';

const STATUS_ORDER = ['NEW', 'PROPOSAL_SENT', 'REPLIED', 'INTERVIEW', 'HIRED', 'LOST'];

export async function getAgentDashboard(agentId: string) {
  const [{ data: leadsRaw, error: leadsErr }, { data: appliedRaw, error: appliedErr }] = await Promise.all([
    supabase.from('freelancer_lead').select('*').eq('agentId', agentId).order('createdAt', { ascending: false }),
    supabase.from('freelancer_applied_job').select('*').eq('agentId', agentId).order('appliedAt', { ascending: false }),
  ]);
  if (leadsErr) throw new Error(leadsErr.message);
  if (appliedErr) throw new Error(appliedErr.message);
  const leads = leadsRaw || [];
  const applied = appliedRaw || [];

  const byStatus: Record<string, number> = {};
  for (const s of STATUS_ORDER) byStatus[s] = 0;
  for (const lead of leads) byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;

  return {
    agentId,
    totalLeads: leads.length,
    totalApplied: applied.length,
    byStatus,
    activeLeads: leads.filter((l: any) => !['HIRED', 'LOST'].includes(l.status)).length,
    wonLeads: byStatus['HIRED'] || 0,
    recentLeads: leads.slice(0, 5),
    recentApplied: applied.slice(0, 8),
  };
}

export async function getAllAgentsPerformance(companyId: string | null) {
  const { data: profiles, error } = await supabase.from('profiles').select('id,name,companyId').eq('role', 'FREELANCER_AGENT');
  if (error) throw new Error(error.message);

  const scoped = (profiles || []).filter((u: any) =>
    companyId === 'company-1' || !companyId ? (u.companyId === 'company-1' || !u.companyId) : u.companyId === companyId,
  );
  if (scoped.length === 0) return [];

  const userIds = scoped.map((u: any) => u.id);
  const { data: agents } = await supabase.from('freelancer_agent').select('id,userId').in('userId', userIds);
  if (!agents || agents.length === 0) return [];

  const nameByUserId = new Map(scoped.map((u: any) => [u.id, u.name]));

  return Promise.all(
    agents.map(async (agent: any) => {
      const dash = await getAgentDashboard(agent.id);
      return {
        agentId: agent.id,
        name: nameByUserId.get(agent.userId) || '—',
        totalLeads: dash.totalLeads,
        totalApplied: dash.totalApplied,
        activeLeads: dash.activeLeads,
        wonLeads: dash.wonLeads,
        byStatus: dash.byStatus,
      };
    }),
  );
}
