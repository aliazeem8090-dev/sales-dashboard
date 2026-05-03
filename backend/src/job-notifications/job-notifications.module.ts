import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobNotification } from './job-notification.entity';
import { JobNotificationsService } from './job-notifications.service';
import { JobNotificationsController } from './job-notifications.controller';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobNotification, User])],
  controllers: [JobNotificationsController],
  providers: [JobNotificationsService],
  exports: [JobNotificationsService],
})
export class JobNotificationsModule {}
