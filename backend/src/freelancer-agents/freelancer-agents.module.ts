import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreelancerAgent } from './freelancer-agent.entity';
import { FreelancerAgentsService } from './freelancer-agents.service';
import { FreelancerAgentsController } from './freelancer-agents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FreelancerAgent])],
  controllers: [FreelancerAgentsController],
  providers: [FreelancerAgentsService],
  exports: [FreelancerAgentsService],
})
export class FreelancerAgentsModule {}
