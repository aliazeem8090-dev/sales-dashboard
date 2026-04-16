import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FreelancerDailyLogsService } from './freelancer-daily-logs.service';

@Controller('freelancer-daily-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FreelancerDailyLogsController {
  constructor(private readonly service: FreelancerDailyLogsService) {}

  @Get('agent/:agentId')
  findByAgent(@Param('agentId') agentId: string) { return this.service.findByAgent(agentId); }

  @Get('today/:agentId')
  getToday(@Param('agentId') agentId: string) { return this.service.getTodayLog(agentId); }

  @Post('upsert/:agentId')
  upsertToday(@Param('agentId') agentId: string, @Body() body: any) {
    return this.service.upsertToday(agentId, body);
  }

  @Patch('comment/:agentId/:date')
  @Roles('ADMIN', 'MANAGER')
  addComment(@Param('agentId') agentId: string, @Param('date') date: string, @Body() body: { comment: string }) {
    return this.service.addManagerComment(agentId, date, body.comment);
  }
}
