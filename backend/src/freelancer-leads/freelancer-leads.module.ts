import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreelancerLead } from './freelancer-lead.entity';
import { FreelancerLeadsService } from './freelancer-leads.service';
import { FreelancerLeadsController } from './freelancer-leads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FreelancerLead])],
  controllers: [FreelancerLeadsController],
  providers: [FreelancerLeadsService],
  exports: [FreelancerLeadsService],
})
export class FreelancerLeadsModule {}
