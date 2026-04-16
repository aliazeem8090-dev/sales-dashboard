import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkedInDailyLog } from './linkedin-daily-log.entity';
import { LinkedInDailyLogsService } from './linkedin-daily-logs.service';
import { LinkedInDailyLogsController } from './linkedin-daily-logs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LinkedInDailyLog])],
  controllers: [LinkedInDailyLogsController],
  providers: [LinkedInDailyLogsService],
  exports: [LinkedInDailyLogsService],
})
export class LinkedInDailyLogsModule {}
