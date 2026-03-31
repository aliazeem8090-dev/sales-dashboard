import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { UpworkProfilesService } from './upwork-profiles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('upwork-profiles')
@UseGuards(JwtAuthGuard)
export class UpworkProfilesController {
  constructor(private readonly upworkProfilesService: UpworkProfilesService) {}

  @Get()
  findAll() {
    return this.upworkProfilesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.upworkProfilesService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.upworkProfilesService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.upworkProfilesService.update(id, body);
  }
}
