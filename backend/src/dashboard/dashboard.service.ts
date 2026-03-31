// backend/src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Proposal, ProposalStatus } from '../proposals/proposal.entity';
import { User, Role } from '../users/user.entity';
import { ActivityLog } from '../activity-logs/activity-log.entity';
import { Rep } from '../reps/rep.entity';
import { BidderAssignment } from '../bidder-assignments/bidder-assignment.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Proposal)
    private proposalsRepository: Repository<Proposal>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ActivityLog)
    private activityLogsRepository: Repository<ActivityLog>,
    @InjectRepository(Rep)
    private repsRepository: Repository<Rep>,
    @InjectRepository(BidderAssignment)
    private assignmentsRepository: Repository<BidderAssignment>,
  ) {}

  private dateFilter(days?: number) {
    if (!days) return {};
    return { submittedAt: Between(new Date(Date.now() - days * 24 * 60 * 60 * 1000), new Date()) };
  }

  async getTeamOverview(days?: number) {
    const df = this.dateFilter(days);
    const totalProposals = await this.proposalsRepository.count({ where: df });
    const totalViewed = await this.proposalsRepository.count({ where: { ...df, status: ProposalStatus.VIEWED } });
    const totalReplied = await this.proposalsRepository.count({ where: { ...df, status: ProposalStatus.REPLIED } });
    const totalInterviews = await this.proposalsRepository.count({ where: { ...df, status: ProposalStatus.INTERVIEW } });
    const totalHires = await this.proposalsRepository.count({ where: { ...df, status: ProposalStatus.HIRED } });

    const qb = this.proposalsRepository.createQueryBuilder('p');
    if (days) qb.where('p.submittedAt >= :from', { from: new Date(Date.now() - days * 24 * 60 * 60 * 1000) });

    const connectsResult = await qb.clone().select('SUM(p.connectsUsed)', 'total').getRawOne();
    const earningsResult = await qb.clone().select('SUM(p.contractValue)', 'total').getRawOne();

    const totalConnectsUsed = parseInt(connectsResult?.total || '0');
    const totalEarnings = parseFloat(earningsResult?.total || '0') || 0;

    return {
      totalProposals,
      totalViewed,
      totalReplied,
      totalInterviews,
      totalHires,
      totalConnectsUsed,
      totalEarnings,
      viewRate: totalProposals > 0 ? Math.round((totalViewed / totalProposals) * 10000) / 100 : 0,
      replyRate: totalProposals > 0 ? Math.round((totalReplied / totalProposals) * 10000) / 100 : 0,
      interviewRate: totalProposals > 0 ? Math.round((totalInterviews / totalProposals) * 10000) / 100 : 0,
      hireRate: totalProposals > 0 ? Math.round((totalHires / totalProposals) * 10000) / 100 : 0,
    };
  }

  async getRepPerformance(repId: string, days?: number) {
    const where: any = { repId };
    if (days) where.submittedAt = Between(new Date(Date.now() - days * 24 * 60 * 60 * 1000), new Date());
    const proposals = await this.proposalsRepository.find({
      where,
      order: { submittedAt: 'DESC' },
    });

    const total = proposals.length;
    const viewed = proposals.filter(p => [ProposalStatus.VIEWED, ProposalStatus.REPLIED, ProposalStatus.INTERVIEW, ProposalStatus.HIRED].includes(p.status)).length;
    const replied = proposals.filter(p => [ProposalStatus.REPLIED, ProposalStatus.INTERVIEW, ProposalStatus.HIRED].includes(p.status)).length;
    const interviews = proposals.filter(p => [ProposalStatus.INTERVIEW, ProposalStatus.HIRED].includes(p.status)).length;
    const hires = proposals.filter(p => p.status === ProposalStatus.HIRED).length;
    const connectsUsed = proposals.reduce((sum, p) => sum + (p.connectsUsed || 0), 0);
    const totalEarnings = proposals.reduce((sum, p) => sum + (p.contractValue || 0), 0);

    const rep = await this.repsRepository.findOne({ where: { id: repId } });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentLogs = await this.activityLogsRepository.count({
      where: { repId, date: Between(thirtyDaysAgo, new Date()) },
    });
    const consistencyScore = Math.min(100, Math.round((recentLogs / 20) * 100));

    const lastLog = await this.activityLogsRepository.findOne({
      where: { repId },
      order: { date: 'DESC' },
    });
    const lastActivityDate = lastLog?.date || null;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const proposalsThisWeek = proposals.filter(p => p.submittedAt >= sevenDaysAgo).length;

    const thirtyDaysAgoDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const earningsThisMonth = proposals
      .filter(p => p.status === ProposalStatus.HIRED && p.hiredAt && p.hiredAt >= thirtyDaysAgoDate)
      .reduce((sum, p) => sum + (p.contractValue || 0), 0);

    return {
      repId,
      totalProposals: total,
      viewed,
      replied,
      interviews,
      hires,
      connectsUsed,
      currentConnects: rep?.currentConnects || 0,
      viewRate: total > 0 ? Math.round((viewed / total) * 10000) / 100 : 0,
      replyRate: total > 0 ? Math.round((replied / total) * 10000) / 100 : 0,
      interviewRate: total > 0 ? Math.round((interviews / total) * 10000) / 100 : 0,
      hireRate: total > 0 ? Math.round((hires / total) * 10000) / 100 : 0,
      connectEfficiency: connectsUsed > 0 ? Math.round((replied / connectsUsed) * 100) / 100 : 0,
      consistencyScore,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      earningsThisMonth: Math.round(earningsThisMonth * 100) / 100,
      lastActivityDate,
      proposalsThisWeek,
      recentProposals: proposals.slice(0, 5),
    };
  }

  async getAllRepsPerformance(days?: number) {
    const users = await this.usersRepository.find({
      where: { role: Role.REP },
      relations: ['rep'],
    });

    return Promise.all(
      users.map(async (user) => {
        if (!user.rep?.id) {
          return { name: user.name, userId: user.id, repId: null, totalProposals: 0, hires: 0, hireRate: 0, replyRate: 0, consistencyScore: 0 };
        }
        const performance = await this.getRepPerformance(user.rep.id, days);
        return { name: user.name, userId: user.id, ...performance };
      }),
    );
  }

  async getNicheStats() {
    const proposals = await this.proposalsRepository.find({ relations: ['profileUsed'] });
    const niches: Record<string, { sent: number; hired: number }> = {};
    for (const p of proposals) {
      const niche = (p.profileUsed as any)?.niche || 'General';
      if (!niches[niche]) niches[niche] = { sent: 0, hired: 0 };
      niches[niche].sent++;
      if (p.status === 'HIRED') niches[niche].hired++;
    }
    return Object.entries(niches).map(([niche, stats]) => ({
      niche,
      sent: stats.sent,
      hired: stats.hired,
      winRate: stats.sent > 0 ? Math.round((stats.hired / stats.sent) * 10000) / 100 : 0,
    }));
  }

  async getTeamTrends(days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const proposals = await this.proposalsRepository.find({
      where: { submittedAt: Between(startDate, new Date()) },
      order: { submittedAt: 'ASC' },
    });

    const byDate: Record<string, number> = {};
    for (const p of proposals) {
      const key = p.submittedAt.toISOString().split('T')[0];
      byDate[key] = (byDate[key] || 0) + 1;
    }

    return Object.entries(byDate).map(([date, count]) => ({ date, proposals: count }));
  }

  async getDealDetail() {
    const deals = await this.proposalsRepository.find({
      where: { status: ProposalStatus.HIRED },
      relations: ['rep', 'rep.user', 'profileUsed', 'job'],
      order: { hiredAt: 'DESC' },
    });
    return deals.map(d => ({
      id: d.id,
      repId: d.repId,
      repName: (d.rep as any)?.user?.name || d.repId,
      profileNiche: (d.profileUsed as any)?.niche || '—',
      profileTitle: (d.profileUsed as any)?.title || '—',
      jobTitle: (d.job as any)?.title || '—',
      contractValue: d.contractValue || null,
      hiredAt: d.hiredAt,
    }));
  }

  async getWeeklySummary() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = await this.proposalsRepository.count({
      where: { submittedAt: Between(sevenDaysAgo, now) },
    });
    const lastWeek = await this.proposalsRepository.count({
      where: { submittedAt: Between(fourteenDaysAgo, sevenDaysAgo) },
    });

    return { thisWeek, lastWeek, change: thisWeek - lastWeek };
  }

  async getLeaderboard(days?: number) {
    const reps = await this.getAllRepsPerformance(days);
    return reps
      .sort((a, b) => (b.hireRate + b.replyRate * 0.3) - (a.hireRate + a.replyRate * 0.3))
      .map((rep, index) => ({ rank: index + 1, ...rep }));
  }

  async getRepSelfDashboard(userId: string) {
    // Find the rep record for the given userId
    const user = await this.usersRepository.findOne({ where: { id: userId }, relations: ['rep'] });
    const rep = user?.rep;
    if (!rep) return null;

    const repId = rep.id;
    const proposals = await this.proposalsRepository.find({
      where: { repId },
      relations: ['job', 'profileUsed'],
      order: { submittedAt: 'DESC' },
    });

    const total = proposals.length;
    const viewed = proposals.filter(p => ['VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
    const replied = proposals.filter(p => ['REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
    const interviews = proposals.filter(p => ['INTERVIEW', 'HIRED'].includes(p.status)).length;
    const hires = proposals.filter(p => p.status === 'HIRED').length;
    const lost = proposals.filter(p => p.status === 'LOST' || p.status === 'REJECTED').length;
    const connectsUsed = proposals.reduce((sum, p) => sum + (p.connectsUsed || 0), 0);
    const totalEarnings = proposals.reduce((sum, p) => sum + (p.contractValue || 0), 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentLogs = await this.activityLogsRepository.count({
      where: { repId, date: Between(thirtyDaysAgo, new Date()) },
    });
    const consistencyScore = Math.min(100, Math.round((recentLogs / 20) * 100));

    const lastLog = await this.activityLogsRepository.findOne({
      where: { repId },
      order: { date: 'DESC' },
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const proposalsThisWeek = proposals.filter(p => p.submittedAt >= sevenDaysAgo).length;

    const assignments = await this.assignmentsRepository.find({
      where: { bidderId: userId, isActive: true },
      relations: ['profile'],
    });

    return {
      repId,
      userId,
      name: user?.name,
      currentConnects: rep.currentConnects || 0,
      weeklyGoals: rep.weeklyGoals,
      targets: rep.targets,
      totalProposals: total,
      viewed,
      replied,
      interviews,
      hires,
      lost,
      connectsUsed,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      viewRate: total > 0 ? Math.round((viewed / total) * 10000) / 100 : 0,
      replyRate: total > 0 ? Math.round((replied / total) * 10000) / 100 : 0,
      interviewRate: total > 0 ? Math.round((interviews / total) * 10000) / 100 : 0,
      hireRate: total > 0 ? Math.round((hires / total) * 10000) / 100 : 0,
      consistencyScore,
      lastActivityDate: lastLog?.date || null,
      proposalsThisWeek,
      assignedProfiles: assignments.map(a => ({ id: a.profileId, title: a.profile?.title, niche: a.profile?.niche })),
      recentProposals: proposals.slice(0, 5),
    };
  }

  async getBidderReport(repId: string) {
    const rep = await this.repsRepository.findOne({ where: { id: repId } });
    const user = rep ? await this.usersRepository.findOne({ where: { id: rep.userId } }) : null;

    const assignments = await this.assignmentsRepository.find({
      where: { bidderId: user?.id, isActive: true },
      relations: ['profile'],
    });

    const proposals = await this.proposalsRepository.find({
      where: { repId },
      order: { submittedAt: 'DESC' },
    });

    const total = proposals.length;
    const viewed = proposals.filter(p => [ProposalStatus.VIEWED, ProposalStatus.REPLIED, ProposalStatus.INTERVIEW, ProposalStatus.HIRED].includes(p.status)).length;
    const replied = proposals.filter(p => [ProposalStatus.REPLIED, ProposalStatus.INTERVIEW, ProposalStatus.HIRED].includes(p.status)).length;
    const interviews = proposals.filter(p => [ProposalStatus.INTERVIEW, ProposalStatus.HIRED].includes(p.status)).length;
    const hires = proposals.filter(p => p.status === ProposalStatus.HIRED).length;
    const connectsUsed = proposals.reduce((sum, p) => sum + (p.connectsUsed || 0), 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activityLogs = await this.activityLogsRepository.find({
      where: { repId, date: Between(thirtyDaysAgo, new Date()) },
      order: { date: 'DESC' },
    });
    const totalLogs = await this.activityLogsRepository.count({ where: { repId } });
    const avgProposalsPerDay = activityLogs.length > 0
      ? Math.round(activityLogs.reduce((sum, l) => sum + (l.proposalsSent || 0), 0) / activityLogs.length * 10) / 10
      : 0;
    const consistencyScore = Math.min(100, Math.round((activityLogs.length / 20) * 100));

    // Per-profile breakdown
    const profileBreakdown = assignments.map(a => {
      const profileProposals = proposals.filter(p => p.profileUsedId === a.profileId);
      const ph = profileProposals.filter(p => p.status === ProposalStatus.HIRED).length;
      return {
        profileId: a.profileId,
        profileTitle: a.profile?.title || 'Unknown',
        niche: a.profile?.niche || '',
        proposalCount: profileProposals.length,
        hires: ph,
        hireRate: profileProposals.length > 0 ? Math.round((ph / profileProposals.length) * 10000) / 100 : 0,
      };
    });

    return {
      bidder: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        repId,
        currentConnects: rep?.currentConnects || 0,
        weeklyGoals: rep?.weeklyGoals,
        targets: rep?.targets,
      },
      assignedProfiles: assignments.map(a => ({ id: a.profileId, title: a.profile?.title, niche: a.profile?.niche })),
      stats: {
        totalProposals: total,
        viewed, replied, interviews, hires, connectsUsed,
        viewRate: total > 0 ? Math.round((viewed / total) * 10000) / 100 : 0,
        replyRate: total > 0 ? Math.round((replied / total) * 10000) / 100 : 0,
        interviewRate: total > 0 ? Math.round((interviews / total) * 10000) / 100 : 0,
        hireRate: total > 0 ? Math.round((hires / total) * 10000) / 100 : 0,
      },
      activity: { totalLogsAllTime: totalLogs, logsLast30Days: activityLogs.length, avgProposalsPerDay, consistencyScore },
      profileBreakdown,
      recentProposals: proposals.slice(0, 10),
    };
  }
}
