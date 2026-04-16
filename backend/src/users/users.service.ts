// backend/src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
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
import { LinkedInAgent } from '../linkedin-agents/linkedin-agent.entity';
import { LinkedInDailyLog } from '../linkedin-daily-logs/linkedin-daily-log.entity';
import { LinkedInLead } from '../linkedin-leads/linkedin-lead.entity';
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
    @InjectRepository(LinkedInAgent)
    private linkedInAgentsRepository: Repository<LinkedInAgent>,
    @InjectRepository(LinkedInDailyLog)
    private linkedInDailyLogsRepository: Repository<LinkedInDailyLog>,
    @InjectRepository(LinkedInLead)
    private linkedInLeadsRepository: Repository<LinkedInLead>,
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

  async changeRole(id: string, newRole: string): Promise<User | null> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);

    await this.usersRepository.update(id, { role: newRole as any });

    if (newRole === 'REP') {
      const existing = await this.repsRepository.findOne({ where: { userId: id } });
      if (!existing) {
        await this.repsRepository.save(this.repsRepository.create({ userId: id }));
      }
      await this.linkedInAgentsRepository.delete({ userId: id });
    }

    if (newRole === 'LINKEDIN_AGENT') {
      const existing = await this.linkedInAgentsRepository.findOne({ where: { userId: id } });
      if (!existing) {
        await this.linkedInAgentsRepository.save(this.linkedInAgentsRepository.create({ userId: id }));
      }
      const rep = await this.repsRepository.findOne({ where: { userId: id } });
      if (rep) {
        await this.repsRepository.delete({ userId: id });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    // Handle Sales Rep cleanup
    const rep = await this.repsRepository.findOne({ where: { userId: id } });
    if (rep) {
      const proposals = await this.proposalsRepository.find({ where: { repId: rep.id } });
      for (const proposal of proposals) {
        await this.proposalReviewsRepository.delete({ proposalId: proposal.id });
        await this.proposalStatusHistoryRepository.delete({ proposalId: proposal.id });
      }
      await this.proposalsRepository.delete({ repId: rep.id });
      await this.activityLogsRepository.delete({ repId: rep.id });
      await this.coachingInsightsRepository.delete({ repId: rep.id });
      await this.bidderAssignmentsRepository.delete({ bidderId: id });
      await this.repsRepository.delete({ userId: id });
    }

    // Handle LinkedIn Agent cleanup
    const agent = await this.linkedInAgentsRepository.findOne({ where: { userId: id } });
    if (agent) {
      await this.linkedInLeadsRepository.delete({ agentId: agent.id });
      await this.linkedInDailyLogsRepository.delete({ agentId: agent.id });
      await this.linkedInAgentsRepository.delete({ userId: id });
    }

    await this.usersRepository.delete(id);
  }
}
