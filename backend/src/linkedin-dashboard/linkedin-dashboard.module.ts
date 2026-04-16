import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkedInAgent } from '../linkedin-agents/linkedin-agent.entity';
import { LinkedInDailyLog } from '../linkedin-daily-logs/linkedin-daily-log.entity';
import { LinkedInLead } from '../linkedin-leads/linkedin-lead.entity';
import { User } from '../users/user.entity';
import { LinkedInDashboardService } from './linkedin-dashboard.service';
import { LinkedInDashboardController } from './linkedin-dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LinkedInAgent, LinkedInDailyLog, LinkedInLead, User])],
  controllers: [LinkedInDashboardController],
  providers: [LinkedInDashboardService],
})
export class LinkedInDashboardModule {}
