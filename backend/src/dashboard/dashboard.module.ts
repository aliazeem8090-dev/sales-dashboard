import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Proposal } from '../proposals/proposal.entity';
import { User } from '../users/user.entity';
import { ActivityLog } from '../activity-logs/activity-log.entity';
import { Rep } from '../reps/rep.entity';
import { BidderAssignment } from '../bidder-assignments/bidder-assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proposal, User, ActivityLog, Rep, BidderAssignment])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
