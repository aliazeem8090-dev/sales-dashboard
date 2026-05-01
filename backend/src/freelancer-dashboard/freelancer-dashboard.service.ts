import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FreelancerAgent } from '../freelancer-agents/freelancer-agent.entity';
import { FreelancerLead, LeadStatus } from '../freelancer-leads/freelancer-lead.entity';
import { FreelancerAppliedJob } from '../freelancer-applied-jobs/freelancer-applied-job.entity';
import { User, Role } from '../users/user.entity';

const STATUS_ORDER = [LeadStatus.NEW, LeadStatus.PROPOSAL_SENT, LeadStatus.REPLIED, LeadStatus.INTERVIEW, LeadStatus.HIRED, LeadStatus.LOST];

@Injectable()
export class FreelancerDashboardService {
  constructor(
    @InjectRepository(FreelancerAgent)      private agentRepo:   Repository<FreelancerAgent>,
    @InjectRepository(FreelancerLead)       private leadRepo:    Repository<FreelancerLead>,
    @InjectRepository(FreelancerAppliedJob) private appliedRepo: Repository<FreelancerAppliedJob>,
    @InjectRepository(User)                 private userRepo:    Repository<User>,
  ) {}

  async getAgentDashboard(agentId: string) {
    const [leads, applied] = await Promise.all([
      this.leadRepo.find({ where: { agentId }, order: { createdAt: 'DESC' } }),
      this.appliedRepo.find({ where: { agentId }, order: { appliedAt: 'DESC' } }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const s of STATUS_ORDER) byStatus[s] = 0;
    for (const lead of leads) byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;

    return {
      agentId,
      totalLeads:   leads.length,
      totalApplied: applied.length,
      byStatus,
      activeLeads:  leads.filter(l => ![LeadStatus.HIRED, LeadStatus.LOST].includes(l.status)).length,
      wonLeads:     byStatus[LeadStatus.HIRED] || 0,
      recentLeads:  leads.slice(0, 5),
      recentApplied: applied.slice(0, 8),
    };
  }

  async getAllAgentsPerformance(companyId: string) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.role = :role', { role: Role.FREELANCER_AGENT });
    if (companyId === 'company-1' || !companyId) {
      qb.andWhere('(user.companyId = :companyId OR user.companyId IS NULL)', { companyId: 'company-1' });
    } else {
      qb.andWhere('user.companyId = :companyId', { companyId });
    }
    const users = await qb.getMany();
    if (users.length === 0) return [];
    const userIds = users.map(u => u.id);
    const agents = await this.agentRepo.find({ where: { userId: In(userIds) }, relations: ['user'] });
    return Promise.all(agents.map(async agent => {
      const dash = await this.getAgentDashboard(agent.id);
      return {
        agentId:      agent.id,
        name:         agent.user?.name || '—',
        totalLeads:   dash.totalLeads,
        totalApplied: dash.totalApplied,
        activeLeads:  dash.activeLeads,
        wonLeads:     dash.wonLeads,
        byStatus:     dash.byStatus,
      };
    }));
  }
}
