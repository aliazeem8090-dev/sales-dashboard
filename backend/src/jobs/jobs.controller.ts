import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    if (category) return this.jobsService.findByCategory(category);
    return this.jobsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.jobsService.findOrCreate(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.jobsService.update(id, body);
  }
}
