import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { LinkedInDailyLogsService } from './linkedin-daily-logs.service';

@Controller('linkedin-daily-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LinkedInDailyLogsController {
  constructor(private readonly service: LinkedInDailyLogsService) {}

  @Get('agent/:agentId')
  findByAgent(@Param('agentId') agentId: string) { return this.service.findByAgent(agentId); }

  @Get('today/:agentId')
  getToday(@Param('agentId') agentId: string) { return this.service.getTodayLog(agentId); }

  @Get('monthly-inmails/:agentId')
  getMonthlyInMails(@Param('agentId') agentId: string) {
    return this.service.getMonthlyInMails(agentId).then(total => ({ total }));
  }

  @Post('upsert/:agentId')
  upsertToday(@Param('agentId') agentId: string, @Body() body: any) {
    return this.service.upsertToday(agentId, body);
  }
}
