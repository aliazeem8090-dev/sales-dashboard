import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { CoachingInsightsService } from './coaching-insights.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InsightSeverity } from './coaching-insight.entity';

@Controller('coaching-insights')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoachingInsightsController {
  constructor(private readonly coachingInsightsService: CoachingInsightsService) {}

  // Team view — managers only
  @Get('team')
  @Roles('ADMIN', 'MANAGER')
  findTeamInsights() {
    return this.coachingInsightsService.findTeamInsights();
  }

  // Per-rep view — reps can only see their own (enforced by caller passing correct repId)
  @Get('rep/:repId')
  findByRep(@Param('repId') repId: string) {
    return this.coachingInsightsService.findByRep(repId);
  }

  // Generate insights — managers only
  @Post('generate/:repId')
  @Roles('ADMIN', 'MANAGER')
  generateForRep(@Param('repId') repId: string) {
    return this.coachingInsightsService.generateForRep(repId);
  }

  // Create manager note — managers only
  @Post('note/:repId')
  @Roles('ADMIN', 'MANAGER')
  createNote(
    @Param('repId') repId: string,
    @Body() body: { note: string; severity: InsightSeverity },
    @Request() req: any,
  ) {
    return this.coachingInsightsService.createNote(repId, body.note, body.severity, req.user.userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.coachingInsightsService.markRead(id);
  }
}
