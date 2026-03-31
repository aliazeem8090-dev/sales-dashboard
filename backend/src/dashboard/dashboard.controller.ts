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

  // Rep self-service — returns only the calling rep's own data
  @Get('rep-self')
  getRepSelfDashboard(@Request() req: any) {
    return this.dashboardService.getRepSelfDashboard(req.user.userId);
  }

  // Manager/Admin only endpoints
  @Get('team-overview')
  @Roles('ADMIN', 'MANAGER')
  getTeamOverview(@Query('days') days?: string) {
    return this.dashboardService.getTeamOverview(days ? parseInt(days) : undefined);
  }

  @Get('reps-performance')
  @Roles('ADMIN', 'MANAGER')
  getAllRepsPerformance() {
    return this.dashboardService.getAllRepsPerformance();
  }

  @Get('leaderboard')
  @Roles('ADMIN', 'MANAGER')
  getLeaderboard(@Query('days') days?: string) {
    return this.dashboardService.getLeaderboard(days ? parseInt(days) : undefined);
  }

  @Get('team-trends')
  @Roles('ADMIN', 'MANAGER')
  getTeamTrends(@Query('days') days?: string) {
    return this.dashboardService.getTeamTrends(days ? parseInt(days) : 30);
  }

  @Get('weekly-summary')
  @Roles('ADMIN', 'MANAGER')
  getWeeklySummary() {
    return this.dashboardService.getWeeklySummary();
  }

  @Get('deals-detail')
  @Roles('ADMIN', 'MANAGER')
  getDealDetail() {
    return this.dashboardService.getDealDetail();
  }

  @Get('niche-stats')
  @Roles('ADMIN', 'MANAGER')
  getNicheStats() {
    return this.dashboardService.getNicheStats();
  }

  @Get('report/:repId')
  @Roles('ADMIN', 'MANAGER')
  getBidderReport(@Param('repId') repId: string) {
    return this.dashboardService.getBidderReport(repId);
  }

  // Rep performance by repId — manager only
  @Get('rep/:repId')
  @Roles('ADMIN', 'MANAGER')
  getRepPerformance(@Param('repId') repId: string) {
    return this.dashboardService.getRepPerformance(repId);
  }
}
