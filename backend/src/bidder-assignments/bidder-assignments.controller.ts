import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { BidderAssignmentsService } from './bidder-assignments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('bidder-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BidderAssignmentsController {
  constructor(private readonly service: BidderAssignmentsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  getAll(@Request() req: any) {
    return this.service.getAllAssignments(req.user.companyId);
  }

  // Any authenticated user can look up their own assignments by their userId
  @Get('bidder/:bidderId')
  getByBidder(@Param('bidderId') bidderId: string) {
    return this.service.getByBidder(bidderId);
  }

  @Get('profile/:profileId')
  @Roles('ADMIN', 'MANAGER')
  getByProfile(@Param('profileId') profileId: string) {
    return this.service.getByProfile(profileId);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  assign(@Body() body: { bidderId: string; profileId: string }, @Request() req: any) {
    return this.service.assign(body.bidderId, body.profileId, req.user.userId);
  }

  @Delete(':bidderId/:profileId')
  @Roles('ADMIN', 'MANAGER')
  unassign(@Param('bidderId') bidderId: string, @Param('profileId') profileId: string) {
    return this.service.unassign(bidderId, profileId);
  }
}
