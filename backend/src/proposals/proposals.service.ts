// backend/src/proposals/proposals.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Proposal, ProposalStatus } from './proposal.entity';
import { Job } from '../jobs/job.entity';
import { ProposalStatusHistoryService } from '../proposal-status-history/proposal-status-history.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { JobNotificationsService } from '../job-notifications/job-notifications.service';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)
    private proposalsRepository: Repository<Proposal>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    private statusHistoryService: ProposalStatusHistoryService,
    private activityLogsService: ActivityLogsService,
    private jobNotificationsService: JobNotificationsService,
  ) {}

  async findAll(filters?: { status?: ProposalStatus; companyId?: string }): Promise<Proposal[]> {
    if (filters?.companyId) {
      const qb = this.proposalsRepository
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.job', 'job')
        .leftJoinAndSelect('p.profileUsed', 'profileUsed')
        .leftJoinAndSelect('p.rep', 'rep')
        .leftJoinAndSelect('rep.user', 'user')
        .where('user.companyId = :companyId', { companyId: filters.companyId })
        .orderBy('p.submittedAt', 'DESC');
      if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
      return qb.getMany();
    }
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    return this.proposalsRepository.find({
      where,
      relations: ['job', 'profileUsed', 'rep', 'rep.user'],
      order: { submittedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Proposal | null> {
    return this.proposalsRepository.findOne({
      where: { id },
      relations: ['job', 'profileUsed', 'reviews'],
    });
  }

  async findByRep(repId: string): Promise<Proposal[]> {
    return this.proposalsRepository.find({
      where: { repId },
      relations: ['job', 'profileUsed'],
      order: { submittedAt: 'DESC' },
    });
  }

  async findByRepWithFilters(
    repId: string,
    filters: { status?: ProposalStatus; startDate?: string; endDate?: string; profileId?: string },
  ): Promise<Proposal[]> {
    const where: any = { repId };
    if (filters.status) where.status = filters.status;
    if (filters.profileId) where.profileUsedId = filters.profileId;
    if (filters.startDate && filters.endDate) {
      where.submittedAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    } else if (filters.startDate) {
      where.submittedAt = Between(new Date(filters.startDate), new Date());
    }
    return this.proposalsRepository.find({
      where,
      relations: ['job', 'profileUsed', 'rep', 'rep.user'],
      order: { submittedAt: 'DESC' },
    });
  }

  async create(
    proposalData: Partial<Proposal>,
    createdBy?: string,
    context?: { companyId?: string; repEmail?: string },
  ): Promise<Proposal> {
    const proposal = this.proposalsRepository.create(proposalData);
    const saved = await this.proposalsRepository.save(proposal);
    await this.statusHistoryService.log(
      saved.id,
      null,
      saved.status || ProposalStatus.SENT,
      createdBy || saved.repId,
    );

    // Cross-company job lead notification: Company 1 → Company 2
    if (context?.companyId === 'company-1' && saved.jobId) {
      this.jobRepository.findOne({ where: { id: saved.jobId } }).then(job => {
        if (job?.upworkJobUrl) {
          this.jobNotificationsService.create({
            jobUrl: job.upworkJobUrl,
            jobTitle: job.title || 'Untitled Job',
            repName: context.repEmail || 'Company 1 Rep',
            sourceCompanyId: 'company-1',
            targetCompanyId: 'company-2',
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    return saved;
  }

  async update(id: string, proposalData: Partial<Proposal>): Promise<Proposal | null> {
    await this.proposalsRepository.update(id, proposalData);
    return this.findOne(id);
  }

  async updateStatus(id: string, status: ProposalStatus, changedBy?: string): Promise<Proposal | null> {
    const existing = await this.proposalsRepository.findOne({ where: { id } });
    const fromStatus = existing?.status ?? null;

    const timestamps: Partial<Proposal> = { status };
    if (status === ProposalStatus.VIEWED) timestamps.viewedAt = new Date();
    if (status === ProposalStatus.REPLIED) timestamps.repliedAt = new Date();
    if (status === ProposalStatus.INTERVIEW) timestamps.interviewAt = new Date();
    if (status === ProposalStatus.HIRED) timestamps.hiredAt = new Date();

    await this.proposalsRepository.update(id, timestamps);

    // Log history entry
    await this.statusHistoryService.log(id, fromStatus, status, changedBy || existing?.repId || id);

    // Update today's activity log for the rep
    const repId = existing?.repId;
    if (repId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existing_log = await this.activityLogsService.getTodayLog(repId);
      if (existing_log) {
        const updates: any = {};
        if (status === ProposalStatus.HIRED && fromStatus !== ProposalStatus.HIRED) {
          updates.dealsClosed = (existing_log.dealsClosed || 0) + 1;
        }
        if (
          (status === ProposalStatus.REPLIED || status === ProposalStatus.INTERVIEW) &&
          fromStatus !== ProposalStatus.REPLIED && fromStatus !== ProposalStatus.INTERVIEW && fromStatus !== ProposalStatus.HIRED
        ) {
          updates.leadsGenerated = (existing_log.leadsGenerated || 0) + 1;
        }
        if (Object.keys(updates).length > 0) {
          await this.activityLogsService.update(existing_log.id, updates);
        }
      }
    }

    return this.findOne(id);
  }

  async getStatusHistory(proposalId: string) {
    return this.statusHistoryService.findByProposal(proposalId);
  }

  async getProposalFunnelStats(repId: string) {
    const proposals = await this.proposalsRepository.find({ where: { repId } });
    return {
      sent: proposals.length,
      viewed: proposals.filter(p => [ProposalStatus.VIEWED, ProposalStatus.REPLIED, ProposalStatus.INTERVIEW, ProposalStatus.HIRED].includes(p.status)).length,
      replied: proposals.filter(p => [ProposalStatus.REPLIED, ProposalStatus.INTERVIEW, ProposalStatus.HIRED].includes(p.status)).length,
      interview: proposals.filter(p => [ProposalStatus.INTERVIEW, ProposalStatus.HIRED].includes(p.status)).length,
      hired: proposals.filter(p => p.status === ProposalStatus.HIRED).length,
      lost: proposals.filter(p => p.status === ProposalStatus.LOST || p.status === ProposalStatus.REJECTED).length,
    };
  }

  async remove(id: string): Promise<void> {
    await this.proposalsRepository.delete(id);
  }

  async removeByOwner(id: string, userId: string): Promise<void> {
    const proposal = await this.proposalsRepository.findOne({
      where: { id },
      relations: ['rep'],
    });
    if (!proposal) throw new NotFoundException(`Proposal ${id} not found`);
    if ((proposal.rep as any)?.userId !== userId) {
      throw new ForbiddenException('You can only delete your own proposals');
    }
    await this.proposalsRepository.delete(id);
  }
}
