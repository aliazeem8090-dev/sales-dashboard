import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LinkedInDashboardService } from './linkedin-dashboard.service';

@Controller('linkedin-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LinkedInDashboardController {
  constructor(private readonly service: LinkedInDashboardService) {}

  @Get('agent/:agentId')
  getAgentDashboard(@Param('agentId') agentId: string) {
    return this.service.getAgentDashboard(agentId);
  }

  @Get('all')
  @Roles('ADMIN', 'MANAGER')
  getAllAgents() { return this.service.getAllAgentsPerformance(); }

  @Post('targets/:agentId')
  @Roles('ADMIN', 'MANAGER')
  setTargets(@Param('agentId') agentId: string, @Body() body: any) {
    return this.service.setTargets(agentId, body);
  }
}
