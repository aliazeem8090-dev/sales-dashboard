// backend/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Rep } from '../reps/rep.entity';
import { Proposal } from '../proposals/proposal.entity';
import { ProposalReview } from '../proposal-reviews/proposal-review.entity';
import { ProposalStatusHistory } from '../proposal-status-history/proposal-status-history.entity';
import { ActivityLog } from '../activity-logs/activity-log.entity';
import { CoachingInsight } from '../coaching-insights/coaching-insight.entity';
import { BidderAssignment } from '../bidder-assignments/bidder-assignment.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Rep)
    private repsRepository: Repository<Rep>,
    @InjectRepository(Proposal)
    private proposalsRepository: Repository<Proposal>,
    @InjectRepository(ProposalReview)
    private proposalReviewsRepository: Repository<ProposalReview>,
    @InjectRepository(ProposalStatusHistory)
    private proposalStatusHistoryRepository: Repository<ProposalStatusHistory>,
    @InjectRepository(ActivityLog)
    private activityLogsRepository: Repository<ActivityLog>,
    @InjectRepository(CoachingInsight)
    private coachingInsightsRepository: Repository<CoachingInsight>,
    @InjectRepository(BidderAssignment)
    private bidderAssignmentsRepository: Repository<BidderAssignment>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['rep'] });
  }

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email }, relations: ['rep'] });
  }

  async create(userData: Partial<User>): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password as string, 10);
    const user = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
    });
    return this.usersRepository.save(user) as Promise<User>;
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    await this.usersRepository.update(id, userData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    // Find rep for this user
    const rep = await this.repsRepository.findOne({ where: { userId: id } });

    if (rep) {
      // Delete proposal children first
      const proposals = await this.proposalsRepository.find({ where: { repId: rep.id } });
      for (const proposal of proposals) {
        await this.proposalReviewsRepository.delete({ proposalId: proposal.id });
        await this.proposalStatusHistoryRepository.delete({ proposalId: proposal.id });
      }
      await this.proposalsRepository.delete({ repId: rep.id });

      // Delete other rep-linked records
      await this.activityLogsRepository.delete({ repId: rep.id });
      await this.coachingInsightsRepository.delete({ repId: rep.id });
      await this.bidderAssignmentsRepository.delete({ bidderId: id });

      await this.repsRepository.delete({ userId: id });
    }

    await this.usersRepository.delete(id);
  }
}
