// backend/src/users/users.controller.ts
import { Controller, Get, Post, Body, Param, Put, Patch, Delete, UseGuards, HttpCode, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Request() req: any, @Body() createUserDto: any) {
    return this.usersService.create({ ...createUserDto, companyId: req.user.companyId });
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/role')
  @Roles('ADMIN', 'MANAGER')
  changeRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.usersService.changeRole(id, body.role);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}