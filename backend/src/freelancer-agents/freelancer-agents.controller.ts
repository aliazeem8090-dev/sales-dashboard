import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FreelancerAgentsService } from './freelancer-agents.service';

@Controller('freelancer-agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FreelancerAgentsController {
  constructor(private readonly service: FreelancerAgentsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  findAll() { return this.service.findAll(); }

  @Get('me')
  getMe(@Request() req: any) { return this.service.findByUserId(req.user.userId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
