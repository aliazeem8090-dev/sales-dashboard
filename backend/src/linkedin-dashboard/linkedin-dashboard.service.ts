import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkedInAgent } from '../linkedin-agents/linkedin-agent.entity';
import { LinkedInDailyLog } from '../linkedin-daily-logs/linkedin-daily-log.entity';
import { LinkedInLead, LeadStatus } from '../linkedin-leads/linkedin-lead.entity';
import { User } from '../users/user.entity';

const DEFAULT_TARGETS = {
  dailyConnectionTarget: 35,
  monthlyInMailLimit:    50,
  minReplyRate:          10,
  minConversionRate:      5,
  leadProcessingRate:    50,
};

function kpiStatus(actual: number, target: number, higherIsBetter: boolean): 'pass' | 'warn' | 'fail' {
  if (target === 0) return 'pass';
  const ratio = higherIsBetter ? actual / target : target / actual;
  if (ratio >= 1)    return 'pass';
  if (ratio >= 0.75) return 'warn';
  return 'fail';
}

@Injectable()
export class LinkedInDashboardService {
  constructor(
    @InjectRepository(LinkedInAgent)    private agentRepo: Repository<LinkedInAgent>,
    @InjectRepository(LinkedInDailyLog) private logRepo:   Repository<LinkedInDailyLog>,
    @InjectRepository(LinkedInLead)     private leadRepo:  Repository<LinkedInLead>,
    @InjectRepository(User)             private userRepo:  Repository<User>,
  ) {}

  async getAgentDashboard(agentId: string) {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    const t = { ...DEFAULT_TARGETS, ...(agent?.targets || {}) };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const allLogs = await this.logRepo
      .createQueryBuilder('l')
      .where('l.agentId = :agentId', { agentId })
      .andWhere('l.date >= :from', { from: thirtyDaysAgo })
      .orderBy('l.date', 'DESC')
      .getMany();

    const todayLog = allLogs.find(l => l.date === today) || null;

    const totalConnections   = allLogs.reduce((s, l) => s + (l.connectionsSent  || 0), 0);
    const totalReplies       = allLogs.reduce((s, l) => s + (l.repliesReceived  || 0), 0);
    const totalJobs          = allLogs.reduce((s, l) => s + (l.jobsApplied      || 0), 0);
    const totalFollowUps     = allLogs.reduce((s, l) => s + (l.followUpsSent    || 0), 0);
    const totalLeadsSearched = allLogs.reduce((s, l) => s + (l.leadsSearched    || 0), 0);

    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    const fromMonth = d.toISOString().split('T')[0];
    const monthlyInMails = allLogs
      .filter(l => l.date >= fromMonth)
      .reduce((s, l) => s + (l.inMailsSent || 0), 0);

    const leads      = await this.leadRepo.find({ where: { agentId } });
    const totalLeads = leads.length;
    const contacted  = leads.filter(l => [LeadStatus.CONTACTED, LeadStatus.REPLIED, LeadStatus.FOLLOWED_UP, LeadStatus.CONVERTED].includes(l.status)).length;
    const replied    = leads.filter(l => [LeadStatus.REPLIED, LeadStatus.FOLLOWED_UP, LeadStatus.CONVERTED].includes(l.status)).length;
    const converted  = leads.filter(l => l.status === LeadStatus.CONVERTED).length;
    const followedUp = leads.filter(l => l.status === LeadStatus.FOLLOWED_UP).length;

    const replyRate      = contacted > 0 ? Math.round((replied    / contacted) * 10000) / 100 : 0;
    const conversionRate = replied   > 0 ? Math.round((converted  / replied)   * 10000) / 100 : 0;
    const processingRate = totalLeadsSearched > 0 ? Math.round((contacted / totalLeadsSearched) * 10000) / 100 : 0;
    const avgDailyConns  = allLogs.length > 0 ? Math.round((totalConnections / allLogs.length) * 10) / 10 : 0;

    const cutoff = new Date(Date.now() - 4 * 86400000);
    const followUpRequired = leads.filter(
      l => l.status === LeadStatus.CONTACTED &&
           l.contactedAt && new Date(l.contactedAt) < cutoff,
    );

    const kpis = {
      dailyConnections:   { actual: avgDailyConns,   target: t.dailyConnectionTarget, higherIsBetter: true,  status: kpiStatus(avgDailyConns,   t.dailyConnectionTarget, true)  },
      monthlyInMails:     { actual: monthlyInMails,   target: t.monthlyInMailLimit,    higherIsBetter: false, status: kpiStatus(monthlyInMails,   t.monthlyInMailLimit,    false) },
      replyRate:          { actual: replyRate,         target: t.minReplyRate,          higherIsBetter: true,  status: kpiStatus(replyRate,         t.minReplyRate,          true)  },
      conversionRate:     { actual: conversionRate,    target: t.minConversionRate,     higherIsBetter: true,  status: kpiStatus(conversionRate,    t.minConversionRate,     true)  },
      leadProcessingRate: { actual: processingRate,    target: t.leadProcessingRate,    higherIsBetter: true,  status: kpiStatus(processingRate,    t.leadProcessingRate,    true)  },
    };

    const alerts: { message: string; level: 'critical' | 'warn' | 'info' }[] = [];
    if (todayLog && (todayLog.connectionsSent || 0) > 40)
      alerts.push({ message: `Connections today (${todayLog.connectionsSent}) exceed the safe daily limit of 40 — risk of LinkedIn restriction`, level: 'critical' });
    if (followUpRequired.length > 0)
      alerts.push({ message: `${followUpRequired.length} lead${followUpRequired.length > 1 ? 's' : ''} contacted 4+ days ago with no reply — follow up now`, level: 'warn' });
    if (monthlyInMails >= 50)
      alerts.push({ message: `Monthly InMail limit reached (${monthlyInMails}/50) — InMails disabled until next month`, level: 'critical' });
    else if (monthlyInMails >= 40)
      alerts.push({ message: `Approaching monthly InMail limit — ${monthlyInMails}/50 used`, level: 'warn' });
    if (contacted >= 10 && replyRate < t.minReplyRate)
      alerts.push({ message: `Reply rate (${replyRate}%) is below your ${t.minReplyRate}% target — review your outreach messaging`, level: 'warn' });
    if (contacted >= 5 && conversionRate < t.minConversionRate)
      alerts.push({ message: `Conversion rate (${conversionRate}%) is below your ${t.minConversionRate}% target`, level: 'info' });

    // 14-day trend
    const trend: { date: string; connections: number; replies: number; inmails: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const log  = allLogs.find(l => l.date === date);
      trend.push({ date, connections: log?.connectionsSent || 0, replies: log?.repliesReceived || 0, inmails: log?.inMailsSent || 0 });
    }

    return {
      agentId,
      targets: t,
      today: todayLog,
      stats: { totalLeads, contacted, replied, converted, followedUp, replyRate, conversionRate, totalConnections, monthlyInMails, totalJobs, totalFollowUps, processingRate, avgDailyConns, totalLeadsSearched },
      kpis,
      followUpRequired,
      alerts,
      trend,
    };
  }

  async getAllAgentsPerformance() {
    const agents = await this.agentRepo.find({ relations: ['user'] });
    return Promise.all(agents.map(async agent => {
      const dash = await this.getAgentDashboard(agent.id);
      return {
        agentId:       agent.id,
        userId:        agent.userId,
        name:          agent.user?.name || '—',
        targets:       dash.targets,
        ...dash.stats,
        kpis:          dash.kpis,
        alerts:        dash.alerts,
        followUpCount: dash.followUpRequired.length,
      };
    }));
  }

  async setTargets(agentId: string, targets: Record<string, any>) {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');
    agent.targets = { ...(agent.targets || {}), ...targets };
    return this.agentRepo.save(agent);
  }
}
