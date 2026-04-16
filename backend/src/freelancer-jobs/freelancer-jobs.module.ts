import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreelancerJob } from './freelancer-job.entity';
import { FreelancerJobsService } from './freelancer-jobs.service';
import { FreelancerJobsController } from './freelancer-jobs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FreelancerJob])],
  controllers: [FreelancerJobsController],
  providers: [FreelancerJobsService],
  exports: [FreelancerJobsService],
})
export class FreelancerJobsModule {}
