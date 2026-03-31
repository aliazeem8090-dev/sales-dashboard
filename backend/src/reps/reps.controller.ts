import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { RepsService } from './reps.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reps')
@UseGuards(JwtAuthGuard)
export class RepsController {
  constructor(private readonly repsService: RepsService) {}

  @Get()
  findAll() {
    return this.repsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.repsService.findOne(id);
  }

  @Get('by-user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.repsService.findByUserId(userId);
  }

  @Post()
  create(@Body() body: any) {
    return this.repsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.repsService.update(id, body);
  }

  @Patch(':id/connects')
  updateConnects(@Param('id') id: string, @Body('currentConnects') currentConnects: number) {
    return this.repsService.updateConnects(id, currentConnects);
  }
}
