import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { UpworkProfilesService } from './upwork-profiles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('upwork-profiles')
@UseGuards(JwtAuthGuard)
export class UpworkProfilesController {
  constructor(private readonly upworkProfilesService: UpworkProfilesService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.upworkProfilesService.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.upworkProfilesService.findOne(id);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.upworkProfilesService.create({ ...body, companyId: req.user.companyId });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.upworkProfilesService.update(id, body);
  }
}
