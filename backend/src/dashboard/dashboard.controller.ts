// backend/src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards, Param, Query, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('rep-self')
  getRepSelfDashboard(@Request() req: any) {
    return this.dashboardService.getRepSelfDashboard(req.user.userId);
  }

  @Get('team-overview')
  @Roles('ADMIN', 'MANAGER')
  getTeamOverview(@Request() req: any, @Query('days') days?: string) {
    return this.dashboardService.getTeamOverview(req.user.companyId, days ? parseInt(days) : undefined);
  }

  @Get('reps-performance')
  @Roles('ADMIN', 'MANAGER')
  getAllRepsPerformance(@Request() req: any) {
    return this.dashboardService.getAllRepsPerformance(req.user.companyId);
  }

  @Get('leaderboard')
  @Roles('ADMIN', 'MANAGER')
  getLeaderboard(@Request() req: any, @Query('days') days?: string) {
    return this.dashboardService.getLeaderboard(req.user.companyId, days ? parseInt(days) : undefined);
  }

  @Get('team-trends')
  @Roles('ADMIN', 'MANAGER')
  getTeamTrends(@Request() req: any, @Query('days') days?: string) {
    return this.dashboardService.getTeamTrends(req.user.companyId, days ? parseInt(days) : 30);
  }

  @Get('weekly-summary')
  @Roles('ADMIN', 'MANAGER')
  getWeeklySummary(@Request() req: any) {
    return this.dashboardService.getWeeklySummary(req.user.companyId);
  }

  @Get('deals-detail')
  @Roles('ADMIN', 'MANAGER')
  getDealDetail(@Request() req: any) {
    return this.dashboardService.getDealDetail(req.user.companyId);
  }

  @Get('niche-stats')
  @Roles('ADMIN', 'MANAGER')
  getNicheStats(@Request() req: any) {
    return this.dashboardService.getNicheStats(req.user.companyId);
  }

  @Get('report/:repId')
  @Roles('ADMIN', 'MANAGER')
  getBidderReport(@Param('repId') repId: string) {
    return this.dashboardService.getBidderReport(repId);
  }

  @Get('rep/:repId')
  @Roles('ADMIN', 'MANAGER')
  getRepPerformance(@Param('repId') repId: string) {
    return this.dashboardService.getRepPerformance(repId);
  }
}
