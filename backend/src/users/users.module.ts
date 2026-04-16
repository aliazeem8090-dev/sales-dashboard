import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
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
import { FreelancerAgent } from '../freelancer-agents/freelancer-agent.entity';
import { FreelancerDailyLog } from '../freelancer-daily-logs/freelancer-daily-log.entity';
import { FreelancerJob } from '../freelancer-jobs/freelancer-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Rep, Proposal, ProposalReview, ProposalStatusHistory, ActivityLog, CoachingInsight, BidderAssignment, LinkedInAgent, LinkedInDailyLog, LinkedInLead, FreelancerAgent, FreelancerDailyLog, FreelancerJob])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
