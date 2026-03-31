import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoachingInsightsService } from './coaching-insights.service';
import { CoachingInsightsController } from './coaching-insights.controller';
import { CoachingInsight } from './coaching-insight.entity';
import { Proposal } from '../proposals/proposal.entity';
import { ActivityLog } from '../activity-logs/activity-log.entity';
import { Rep } from '../reps/rep.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CoachingInsight, Proposal, ActivityLog, Rep])],
  controllers: [CoachingInsightsController],
  providers: [CoachingInsightsService],
  exports: [CoachingInsightsService],
})
export class CoachingInsightsModule {}
