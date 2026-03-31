import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoachingInsight, InsightType, InsightSeverity } from './coaching-insight.entity';
import { Proposal } from '../proposals/proposal.entity';
import { ActivityLog } from '../activity-logs/activity-log.entity';
import { Rep } from '../reps/rep.entity';

@Injectable()
export class CoachingInsightsService {
  constructor(
    @InjectRepository(CoachingInsight)
    private insightsRepository: Repository<CoachingInsight>,
    @InjectRepository(Proposal)
    private proposalsRepository: Repository<Proposal>,
    @InjectRepository(ActivityLog)
    private activityLogsRepository: Repository<ActivityLog>,
    @InjectRepository(Rep)
    private repsRepository: Repository<Rep>,
  ) {}

  async findByRep(repId: string): Promise<CoachingInsight[]> {
    return this.insightsRepository.find({
      where: { repId },
      order: { createdAt: 'DESC' },
    });
  }

  async findTeamInsights(): Promise<CoachingInsight[]> {
    return this.insightsRepository.find({
      relations: ['rep', 'rep.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async markRead(id: string): Promise<CoachingInsight | null> {
    await this.insightsRepository.update(id, { isRead: true });
    return this.insightsRepository.findOne({ where: { id } });
  }

  async createNote(repId: string, note: string, severity: InsightSeverity, createdBy?: string): Promise<CoachingInsight> {
    const prefix = createdBy ? '' : '';
    const entity = this.insightsRepository.create({
      repId,
      insightType: InsightType.MANAGER_NOTE,
      generatedInsight: note,
      severity,
      isRead: false,
    });
    return this.insightsRepository.save(entity);
  }

  async generateForRep(repId: string): Promise<CoachingInsight[]> {
    const proposals = await this.proposalsRepository.find({ where: { repId } });
    const rep = await this.repsRepository.findOne({ where: { id: repId }, relations: ['user'] });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentLogs = await this.activityLogsRepository
      .createQueryBuilder('log')
      .where('log.repId = :repId', { repId })
      .andWhere('log.date >= :oneWeekAgo', { oneWeekAgo })
      .getMany();

    const prevWeekLogs = await this.activityLogsRepository
      .createQueryBuilder('log')
      .where('log.repId = :repId', { repId })
      .andWhere('log.date >= :twoWeeksAgo AND log.date < :oneWeekAgo', { twoWeeksAgo, oneWeekAgo })
      .getMany();

    const insights: Partial<CoachingInsight>[] = [];
    const total = proposals.length;

    if (total > 0) {
      const replied = proposals.filter(p => ['REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
      const viewed = proposals.filter(p => ['VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length;
      const hired = proposals.filter(p => p.status === 'HIRED').length;
      const replyRate = (replied / total) * 100;
      const viewRate = (viewed / total) * 100;
      const hireRate = (hired / total) * 100;

      if (total >= 10 && replyRate < 15) {
        insights.push({
          repId,
          insightType: InsightType.PROPOSAL_QUALITY,
          generatedInsight: `Sending volume is good (${total} proposals) but reply rate is only ${replyRate.toFixed(1)}% — below the 15% benchmark. Focus on personalization and hook strength in your next 5 proposals.`,
          severity: InsightSeverity.HIGH,
        });
      }

      if (total >= 20 && viewRate === 0) {
        insights.push({
          repId,
          insightType: InsightType.PROPOSAL_QUALITY,
          generatedInsight: `None of your last ${total} proposals have been viewed. This may indicate title/opening issues or profile visibility problems. Try A/B testing two different hooks this week.`,
          severity: InsightSeverity.CRITICAL,
        });
      }

      if (hireRate > 10) {
        insights.push({
          repId,
          insightType: InsightType.PERFORMANCE,
          generatedInsight: `Strong performance — hire rate is ${hireRate.toFixed(1)}%, above the 10% target. Your proposal approach is working well. Consider documenting your best-performing proposal as a template.`,
          severity: InsightSeverity.LOW,
        });
      }
    }

    if (recentLogs.length < prevWeekLogs.length && prevWeekLogs.length > 0) {
      insights.push({
        repId,
        insightType: InsightType.ACTIVITY,
        generatedInsight: `Activity dropped this week: ${recentLogs.length} log entries vs ${prevWeekLogs.length} last week. Check challenge logs to identify blockers.`,
        severity: InsightSeverity.MEDIUM,
      });
    }

    const daysSinceLastLog = recentLogs.length === 0 ? 7 : 0;
    if (daysSinceLastLog >= 3) {
      insights.push({
        repId,
        insightType: InsightType.ACTIVITY,
        generatedInsight: `No activity logged in the past ${daysSinceLastLog} days. Consistency is key to pipeline health — even low-activity days should be logged with a justification.`,
        severity: InsightSeverity.HIGH,
      });
    }

    if (rep && rep.currentConnects < 10) {
      insights.push({
        repId,
        insightType: InsightType.ACTIVITY,
        generatedInsight: `Connects are running low (${rep.currentConnects} remaining). Prioritize high-fit jobs to maximize return on remaining connects. Flag this to your manager for a top-up if needed.`,
        severity: InsightSeverity.HIGH,
      });
    }

    const saved: CoachingInsight[] = [];
    for (const insight of insights) {
      const entity = this.insightsRepository.create(insight);
      saved.push(await this.insightsRepository.save(entity));
    }
    return saved;
  }
}
