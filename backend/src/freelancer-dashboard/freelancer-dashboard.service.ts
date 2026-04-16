import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreelancerAgent } from '../freelancer-agents/freelancer-agent.entity';
import { FreelancerDailyLog } from '../freelancer-daily-logs/freelancer-daily-log.entity';
import { FreelancerJob, JobStatus } from '../freelancer-jobs/freelancer-job.entity';
import { User } from '../users/user.entity';

const DEFAULT_TARGETS = {
  dailyProposalTarget:  5,
  minResponseRate:      20,
  minInterviewRate:     30,
  minHireRate:          25,
  followUpCompliance:   80,
};

const ACTIVE_STATUSES = [JobStatus.APPLIED, JobStatus.VIEWED, JobStatus.REPLIED, JobStatus.INTERVIEW, JobStatus.HIRED];

function kpiStatus(actual: number, target: number, higherIsBetter: boolean): 'pass' | 'warn' | 'fail' {
  if (target === 0) return 'pass';
  const ratio = higherIsBetter ? actual / target : target / actual;
  if (ratio >= 1)    return 'pass';
  if (ratio >= 0.75) return 'warn';
  return 'fail';
}

@Injectable()
export class FreelancerDashboardService {
  constructor(
    @InjectRepository(FreelancerAgent)    private agentRepo: Repository<FreelancerAgent>,
    @InjectRepository(FreelancerDailyLog) private logRepo:   Repository<FreelancerDailyLog>,
    @InjectRepository(FreelancerJob)      private jobRepo:   Repository<FreelancerJob>,
    @InjectRepository(User)               private userRepo:  Repository<User>,
  ) {}

  async getAgentDashboard(agentId: string) {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    const t = { ...DEFAULT_TARGETS, ...(agent?.targets || {}) };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const today         = new Date().toISOString().split('T')[0];

    const allLogs = await this.logRepo
      .createQueryBuilder('l')
      .where('l.agentId = :agentId', { agentId })
      .andWhere('l.date >= :from', { from: thirtyDaysAgo })
      .orderBy('l.date', 'DESC')
      .getMany();

    const todayLog  = allLogs.find(l => l.date === today) || null;
    const activeDays = allLogs.length;

    // 30-day aggregate log stats
    const totalProposals  = allLogs.reduce((s, l) => s + (l.proposalsSent    || 0), 0);
    const totalReplies    = allLogs.reduce((s, l) => s + (l.clientReplies    || 0), 0);
    const totalInterviews = allLogs.reduce((s, l) => s + (l.interviewsBooked || 0), 0);
    const totalDeals      = allLogs.reduce((s, l) => s + (l.dealsClosed      || 0), 0);
    const totalFollowUps  = allLogs.reduce((s, l) => s + (l.followUpsSent    || 0), 0);

    const avgDailyProposals = activeDays > 0 ? Math.round((totalProposals / activeDays) * 10) / 10 : 0;
    const responseRate      = totalProposals  > 0 ? Math.round((totalReplies    / totalProposals)  * 10000) / 100 : 0;
    const interviewRate     = totalReplies    > 0 ? Math.round((totalInterviews / totalReplies)    * 10000) / 100 : 0;
    const hireRate          = totalInterviews > 0 ? Math.round((totalDeals      / totalInterviews) * 10000) / 100 : 0;

    // Job pipeline stats
    const jobs        = await this.jobRepo.find({ where: { agentId } });
    const totalJobs   = jobs.length;
    const applied     = jobs.filter(j => ACTIVE_STATUSES.includes(j.status)).length;
    const viewed      = jobs.filter(j => [JobStatus.VIEWED, JobStatus.REPLIED, JobStatus.INTERVIEW, JobStatus.HIRED].includes(j.status)).length;
    const replied     = jobs.filter(j => [JobStatus.REPLIED, JobStatus.INTERVIEW, JobStatus.HIRED].includes(j.status)).length;
    const interviewed = jobs.filter(j => [JobStatus.INTERVIEW, JobStatus.HIRED].includes(j.status)).length;
    const hired       = jobs.filter(j => j.status === JobStatus.HIRED).length;
    const lost        = jobs.filter(j => j.status === JobStatus.LOST).length;

    // Follow-up required: applied/viewed + 4+ days ago + no follow-up in 3 days
    const staleAt       = new Date(Date.now() - 4 * 86400000);
    const followUpStale = new Date(Date.now() - 3 * 86400000);
    const followUpRequired = jobs.filter(j =>
      [JobStatus.APPLIED, JobStatus.VIEWED].includes(j.status) &&
      j.appliedAt && new Date(j.appliedAt) < staleAt &&
      (!j.lastFollowUpAt || new Date(j.lastFollowUpAt) < followUpStale),
    );

    // Follow-up compliance: stale proposals that actually got follow-ups
    const fromDate = new Date(thirtyDaysAgo + 'T00:00:00');
    const staleInPeriod = jobs.filter(j => j.appliedAt && new Date(j.appliedAt) >= fromDate && new Date(j.appliedAt) < staleAt);
    const followedUpCount = staleInPeriod.filter(j => j.lastFollowUpAt || j.status !== JobStatus.APPLIED).length;
    const followUpComplianceActual = staleInPeriod.length > 0
      ? Math.round((followedUpCount / staleInPeriod.length) * 10000) / 100
      : 100;

    const kpis = {
      dailyProposals:    { actual: avgDailyProposals,        target: t.dailyProposalTarget, higherIsBetter: true, status: kpiStatus(avgDailyProposals,        t.dailyProposalTarget, true) },
      responseRate:      { actual: responseRate,             target: t.minResponseRate,      higherIsBetter: true, status: kpiStatus(responseRate,             t.minResponseRate,      true) },
      interviewRate:     { actual: interviewRate,            target: t.minInterviewRate,     higherIsBetter: true, status: kpiStatus(interviewRate,            t.minInterviewRate,     true) },
      hireRate:          { actual: hireRate,                 target: t.minHireRate,          higherIsBetter: true, status: kpiStatus(hireRate,                 t.minHireRate,          true) },
      followUpCompliance:{ actual: followUpComplianceActual, target: t.followUpCompliance,   higherIsBetter: true, status: kpiStatus(followUpComplianceActual, t.followUpCompliance,   true) },
    };

    const alerts: { message: string; level: 'critical' | 'warn' | 'info' }[] = [];

    if (!todayLog || (todayLog.proposalsSent || 0) === 0)
      alerts.push({ message: `No proposals logged today — your daily target is ${t.dailyProposalTarget}`, level: 'warn' });

    if (followUpRequired.length > 0)
      alerts.push({ message: `${followUpRequired.length} proposal${followUpRequired.length > 1 ? 's' : ''} need a follow-up — applied 4+ days ago with no response`, level: 'warn' });

    if (activeDays >= 5 && avgDailyProposals < t.dailyProposalTarget * 0.6)
      alerts.push({ message: `Daily proposal volume (${avgDailyProposals}/day) is well below your target of ${t.dailyProposalTarget}/day`, level: 'critical' });

    if (totalProposals >= 10 && responseRate < t.minResponseRate)
      alerts.push({ message: `Response rate (${responseRate}%) is below your ${t.minResponseRate}% target — review your proposal quality`, level: 'warn' });

    if (totalProposals >= 20 && responseRate > t.minResponseRate * 1.5 && hireRate < t.minHireRate * 0.5)
      alerts.push({ message: 'Strong reply rate but low hire conversion — focus on interview preparation', level: 'info' });

    if (staleInPeriod.length >= 5 && followUpComplianceActual < t.followUpCompliance)
      alerts.push({ message: `Follow-up compliance (${followUpComplianceActual}%) is below target — ${followUpRequired.length} proposals overdue`, level: 'warn' });

    // 14-day trend
    const trend: { date: string; proposals: number; replies: number; interviews: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const log  = allLogs.find(l => l.date === date);
      trend.push({ date, proposals: log?.proposalsSent || 0, replies: log?.clientReplies || 0, interviews: log?.interviewsBooked || 0 });
    }

    return {
      agentId,
      targets: t,
      today: todayLog,
      stats: {
        totalProposals, totalReplies, totalInterviews, totalDeals, totalFollowUps,
        avgDailyProposals, responseRate, interviewRate, hireRate,
        followUpComplianceActual, activeDays,
        totalJobs, applied, viewed, replied, interviewed, hired, lost,
      },
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
