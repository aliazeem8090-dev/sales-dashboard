import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreelancerAppliedJob } from './freelancer-applied-job.entity';
import { FreelancerAppliedJobsService } from './freelancer-applied-jobs.service';
import { FreelancerAppliedJobsController } from './freelancer-applied-jobs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FreelancerAppliedJob])],
  controllers: [FreelancerAppliedJobsController],
  providers: [FreelancerAppliedJobsService],
  exports: [FreelancerAppliedJobsService],
})
export class FreelancerAppliedJobsModule {}
