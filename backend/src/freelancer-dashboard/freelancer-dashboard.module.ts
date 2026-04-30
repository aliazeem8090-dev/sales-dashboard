import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreelancerAgent } from '../freelancer-agents/freelancer-agent.entity';
import { FreelancerLead } from '../freelancer-leads/freelancer-lead.entity';
import { FreelancerAppliedJob } from '../freelancer-applied-jobs/freelancer-applied-job.entity';
import { User } from '../users/user.entity';
import { FreelancerDashboardService } from './freelancer-dashboard.service';
import { FreelancerDashboardController } from './freelancer-dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FreelancerAgent, FreelancerLead, FreelancerAppliedJob, User])],
  controllers: [FreelancerDashboardController],
  providers: [FreelancerDashboardService],
})
export class FreelancerDashboardModule {}
