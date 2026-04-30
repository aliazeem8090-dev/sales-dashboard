import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
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
  getAllAgents(@Request() req: any) {
    return this.service.getAllAgentsPerformance(req.user.companyId);
  }
}
