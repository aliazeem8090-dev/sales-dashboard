import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Post()
  create(@Body() body: any) {
    return this.activityLogsService.create(body);
  }

  @Get('rep/:repId')
  findByRep(
    @Param('repId') repId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.activityLogsService.findByRep(repId, start, end);
  }

  @Get('today/:repId')
  getTodayLog(@Param('repId') repId: string) {
    return this.activityLogsService.getTodayLog(repId);
  }

  @Get('team')
  getTeamSummary(@Query('start') start: string, @Query('end') end: string) {
    const startDate = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = end || new Date().toISOString();
    return this.activityLogsService.getTeamSummary(startDate, endDate);
  }
}
