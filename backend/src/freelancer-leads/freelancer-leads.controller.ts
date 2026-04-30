import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FreelancerLeadsService } from './freelancer-leads.service';
import { LeadStatus } from './freelancer-lead.entity';

@Controller('freelancer-leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FreelancerLeadsController {
  constructor(private readonly service: FreelancerLeadsService) {}

  @Get('agent/:agentId')
  findByAgent(@Param('agentId') agentId: string) {
    return this.service.findByAgent(agentId);
  }

  @Post('agent/:agentId')
  create(@Param('agentId') agentId: string, @Body() body: any) {
    return this.service.create(agentId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ clientName: string; jobDescription: string; proposal: string; contactMobile: string; contactEmail: string; status: LeadStatus; notes: string }>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
