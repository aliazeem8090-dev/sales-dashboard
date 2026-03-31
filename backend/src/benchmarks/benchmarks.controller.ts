import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { BenchmarksService } from './benchmarks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileType } from './benchmark.entity';

@Controller('benchmarks')
@UseGuards(JwtAuthGuard)
export class BenchmarksController {
  constructor(private readonly benchmarksService: BenchmarksService) {}

  @Get()
  findAll() {
    return this.benchmarksService.findAll();
  }

  @Get('profile/:type')
  findByProfile(@Param('type') type: ProfileType) {
    return this.benchmarksService.findByProfile(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.benchmarksService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.benchmarksService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.benchmarksService.update(id, body);
  }
}
