import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { Proposal } from './proposal.entity';
import { Job } from '../jobs/job.entity';
import { ProposalStatusHistoryModule } from '../proposal-status-history/proposal-status-history.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { JobNotificationsModule } from '../job-notifications/job-notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proposal, Job]),
    ProposalStatusHistoryModule,
    ActivityLogsModule,
    JobNotificationsModule,
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
