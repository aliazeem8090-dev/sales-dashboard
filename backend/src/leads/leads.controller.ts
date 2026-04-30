import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
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

  @Get('my')
  @Roles('REP', 'ADMIN', 'MANAGER')
  findMine(@Request() req: any) {
    return this.service.findByUserId(req.user.userId);
  }

  @Patch(':id')
  @Roles('REP', 'ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() body: any) {
    const { id: _id, repId: _r, companyId: _c, createdAt: _d, rep: _rep, ...safe } = body;
    return this.service.update(id, safe);
  }
}
