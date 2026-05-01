import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobNotification } from './job-notification.entity';
import { JobNotificationsService } from './job-notifications.service';
import { JobNotificationsController } from './job-notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([JobNotification])],
  controllers: [JobNotificationsController],
  providers: [JobNotificationsService],
  exports: [JobNotificationsService],
})
export class JobNotificationsModule {}
