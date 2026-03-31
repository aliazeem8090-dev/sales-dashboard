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

@Module({
  imports: [TypeOrmModule.forFeature([User, Rep, Proposal, ProposalReview, ProposalStatusHistory, ActivityLog, CoachingInsight, BidderAssignment])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
