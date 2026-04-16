import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreelancerDailyLog } from './freelancer-daily-log.entity';
import { FreelancerDailyLogsService } from './freelancer-daily-logs.service';
import { FreelancerDailyLogsController } from './freelancer-daily-logs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FreelancerDailyLog])],
  controllers: [FreelancerDailyLogsController],
  providers: [FreelancerDailyLogsService],
  exports: [FreelancerDailyLogsService],
})
export class FreelancerDailyLogsModule {}
