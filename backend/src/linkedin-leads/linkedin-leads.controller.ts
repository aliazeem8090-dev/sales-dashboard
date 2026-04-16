import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { LinkedInLeadsService } from './linkedin-leads.service';
import { LeadStatus } from './linkedin-lead.entity';

@Controller('linkedin-leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LinkedInLeadsController {
  constructor(private readonly service: LinkedInLeadsService) {}

  @Get('agent/:agentId')
  findByAgent(@Param('agentId') agentId: string) { return this.service.findByAgent(agentId); }

  @Get('followup/:agentId')
  followUpRequired(@Param('agentId') agentId: string) { return this.service.getFollowUpRequired(agentId); }

  @Post()
  createWithBody(@Body() body: any) { return this.service.create(body.agentId, body); }

  @Post('agent/:agentId')
  create(@Param('agentId') agentId: string, @Body() body: any) { return this.service.create(agentId, body); }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: LeadStatus }) { return this.service.update(id, body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
