import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkedInLead } from './linkedin-lead.entity';
import { LinkedInLeadsService } from './linkedin-leads.service';
import { LinkedInLeadsController } from './linkedin-leads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LinkedInLead])],
  controllers: [LinkedInLeadsController],
  providers: [LinkedInLeadsService],
  exports: [LinkedInLeadsService],
})
export class LinkedInLeadsModule {}
