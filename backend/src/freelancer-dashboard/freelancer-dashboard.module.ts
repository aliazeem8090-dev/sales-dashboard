import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreelancerAgent } from '../freelancer-agents/freelancer-agent.entity';
import { FreelancerDailyLog } from '../freelancer-daily-logs/freelancer-daily-log.entity';
import { FreelancerJob } from '../freelancer-jobs/freelancer-job.entity';
import { User } from '../users/user.entity';
import { FreelancerDashboardService } from './freelancer-dashboard.service';
import { FreelancerDashboardController } from './freelancer-dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FreelancerAgent, FreelancerDailyLog, FreelancerJob, User])],
  controllers: [FreelancerDashboardController],
  providers: [FreelancerDashboardService],
})
export class FreelancerDashboardModule {}
