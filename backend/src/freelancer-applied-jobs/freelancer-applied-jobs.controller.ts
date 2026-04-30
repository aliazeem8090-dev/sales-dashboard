import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FreelancerAppliedJobsService } from './freelancer-applied-jobs.service';

@Controller('freelancer-applied-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FreelancerAppliedJobsController {
  constructor(private readonly service: FreelancerAppliedJobsService) {}

  @Get('agent/:agentId')
  findByAgent(@Param('agentId') agentId: string) {
    return this.service.findByAgent(agentId);
  }

  @Post('agent/:agentId')
  create(@Param('agentId') agentId: string, @Body() body: { url: string; title?: string }) {
    return this.service.create(agentId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
