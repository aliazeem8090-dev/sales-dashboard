// backend/src/proposals/proposals.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Proposal, ProposalStatus } from './proposal.entity';
import { ProposalStatusHistoryService } from '../proposal-status-history/proposal-status-history.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)
    private proposalsRepository: Repository<Proposal>,
    private statusHistoryService: ProposalStatusHistoryService,
    private activityLogsService: ActivityLogsService,
  ) {}

  async findAll(filters?: { status?: ProposalStatus }): Promise<Proposal[]> {
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

  async create(proposalData: Partial<Proposal>, createdBy?: string): Promise<Proposal> {
    const proposal = this.proposalsRepository.create(proposalData);
    const saved = await this.proposalsRepository.save(proposal);
    // Log initial status to history
    await this.statusHistoryService.log(
      saved.id,
      null,
      saved.status || ProposalStatus.SENT,
      createdBy || saved.repId,
    );
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
