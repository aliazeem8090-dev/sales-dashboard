import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JobNotificationsService } from './job-notifications.service';

@Controller('job-notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobNotificationsController {
  constructor(private readonly service: JobNotificationsService) {}

  @Get('unread-count')
  @Roles('ADMIN', 'MANAGER')
  async unreadCount(@Request() req: any) {
    const count = await this.service.getUnreadCountForUser(req.user.companyId, req.user.userId);
    return { count };
  }

  @Patch('read-all')
  @Roles('ADMIN', 'MANAGER')
  async markAllRead(@Request() req: any) {
    await this.service.markAllReadForUser(req.user.companyId, req.user.userId);
    return { ok: true };
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  findAll(@Request() req: any) {
    return this.service.findForUser(req.user.companyId, req.user.userId);
  }

  @Patch(':id/read')
  @Roles('ADMIN', 'MANAGER')
  async markRead(@Param('id') id: string) {
    await this.service.markRead(id);
    return { ok: true };
  }
}
