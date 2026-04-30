import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Post()
  @Roles('REP', 'ADMIN', 'MANAGER')
  create(@Body() body: any, @Request() req: any) {
    return this.service.create({ ...body, companyId: req.user.companyId });
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  findAll(@Request() req: any) {
    return this.service.findByCompany(req.user.companyId);
  }
}
