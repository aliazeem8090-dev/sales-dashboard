import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FreelancerDashboardService } from './freelancer-dashboard.service';

@Controller('freelancer-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FreelancerDashboardController {
  constructor(private readonly service: FreelancerDashboardService) {}

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
