import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProposalReview } from './proposal-review.entity';

@Injectable()
export class ProposalReviewsService {
  constructor(
    @InjectRepository(ProposalReview)
    private reviewsRepository: Repository<ProposalReview>,
  ) {}

  async create(data: Partial<ProposalReview>): Promise<ProposalReview> {
    const review = this.reviewsRepository.create(data);
    return this.reviewsRepository.save(review);
  }

  async findByProposal(proposalId: string): Promise<ProposalReview[]> {
    return this.reviewsRepository.find({
      where: { proposalId },
      order: { createdAt: 'DESC' },
    });
  }

  async findLatest(proposalId: string): Promise<ProposalReview | null> {
    return this.reviewsRepository.findOne({
      where: { proposalId },
      order: { createdAt: 'DESC' },
    });
  }
}
