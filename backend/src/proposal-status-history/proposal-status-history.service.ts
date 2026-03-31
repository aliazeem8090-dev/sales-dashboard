import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProposalStatusHistory } from './proposal-status-history.entity';
import { ProposalStatus } from '../proposals/proposal.entity';

@Injectable()
export class ProposalStatusHistoryService {
  constructor(
    @InjectRepository(ProposalStatusHistory)
    private historyRepository: Repository<ProposalStatusHistory>,
  ) {}

  async log(
    proposalId: string,
    fromStatus: ProposalStatus | null,
    toStatus: ProposalStatus,
    changedBy: string,
    notes?: string,
  ): Promise<ProposalStatusHistory> {
    const entry = this.historyRepository.create({ proposalId, fromStatus, toStatus, changedBy, notes });
    return this.historyRepository.save(entry);
  }

  async findByProposal(proposalId: string): Promise<ProposalStatusHistory[]> {
    return this.historyRepository.find({
      where: { proposalId },
      order: { changedAt: 'ASC' },
    });
  }
}
