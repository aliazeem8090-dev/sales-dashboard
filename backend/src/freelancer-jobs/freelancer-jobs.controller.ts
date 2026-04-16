import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FreelancerJobsService } from './freelancer-jobs.service';

@Controller('freelancer-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FreelancerJobsController {
  constructor(private readonly service: FreelancerJobsService) {}

  @Get('agent/:agentId')
  findByAgent(@Param('agentId') agentId: string) { return this.service.findByAgent(agentId); }

  @Get('followup/:agentId')
  followUpRequired(@Param('agentId') agentId: string) { return this.service.getFollowUpRequired(agentId); }

  @Post()
  create(@Body() body: any) { return this.service.create(body.agentId, body); }

  @Post('agent/:agentId')
  createForAgent(@Param('agentId') agentId: string, @Body() body: any) { return this.service.create(agentId, body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Patch(':id/followup')
  markFollowUp(@Param('id') id: string) { return this.service.markFollowUp(id); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
