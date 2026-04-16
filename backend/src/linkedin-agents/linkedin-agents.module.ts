import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkedInAgent } from './linkedin-agent.entity';
import { LinkedInAgentsService } from './linkedin-agents.service';
import { LinkedInAgentsController } from './linkedin-agents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LinkedInAgent])],
  controllers: [LinkedInAgentsController],
  providers: [LinkedInAgentsService],
  exports: [LinkedInAgentsService],
})
export class LinkedInAgentsModule {}
