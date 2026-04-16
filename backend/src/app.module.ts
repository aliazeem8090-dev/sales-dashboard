import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ProposalsModule } from './proposals/proposals.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ChatModule } from './chat/chat.module';
import { RepsModule } from './reps/reps.module';
import { UpworkProfilesModule } from './upwork-profiles/upwork-profiles.module';
import { JobsModule } from './jobs/jobs.module';
import { ProposalReviewsModule } from './proposal-reviews/proposal-reviews.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { CoachingInsightsModule } from './coaching-insights/coaching-insights.module';
import { BenchmarksModule } from './benchmarks/benchmarks.module';
import { AuthModule } from './auth/auth.module';
import { BidderAssignmentsModule } from './bidder-assignments/bidder-assignments.module';
import { BidderAssignment } from './bidder-assignments/bidder-assignment.entity';
import { ProposalStatusHistoryModule } from './proposal-status-history/proposal-status-history.module';
import { ProposalStatusHistory } from './proposal-status-history/proposal-status-history.entity';
import { LinkedInAgentsModule } from './linkedin-agents/linkedin-agents.module';
import { LinkedInAgent } from './linkedin-agents/linkedin-agent.entity';
import { LinkedInDailyLogsModule } from './linkedin-daily-logs/linkedin-daily-logs.module';
import { LinkedInDailyLog } from './linkedin-daily-logs/linkedin-daily-log.entity';
import { LinkedInLeadsModule } from './linkedin-leads/linkedin-leads.module';
import { LinkedInLead } from './linkedin-leads/linkedin-lead.entity';
import { LinkedInDashboardModule } from './linkedin-dashboard/linkedin-dashboard.module';
import { User } from './users/user.entity';
import { Rep } from './reps/rep.entity';
import { UpworkProfile } from './upwork-profiles/upwork-profile.entity';
import { Job } from './jobs/job.entity';
import { Proposal } from './proposals/proposal.entity';
import { ProposalReview } from './proposal-reviews/proposal-review.entity';
import { ActivityLog } from './activity-logs/activity-log.entity';
import { CoachingInsight } from './coaching-insights/coaching-insight.entity';
import { Benchmark } from './benchmarks/benchmark.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306') || 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sales_dashboard',
      entities: [User, Rep, UpworkProfile, Job, Proposal, ProposalReview, ActivityLog, CoachingInsight, Benchmark, BidderAssignment, ProposalStatusHistory, LinkedInAgent, LinkedInDailyLog, LinkedInLead],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    ProposalsModule,
    DashboardModule,
    ChatModule,
    RepsModule,
    UpworkProfilesModule,
    JobsModule,
    ProposalReviewsModule,
    ActivityLogsModule,
    CoachingInsightsModule,
    BenchmarksModule,
    BidderAssignmentsModule,
    ProposalStatusHistoryModule,
    LinkedInAgentsModule,
    LinkedInDailyLogsModule,
    LinkedInLeadsModule,
    LinkedInDashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
