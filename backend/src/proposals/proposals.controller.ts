// backend/src/proposals/proposals.controller.ts
import { Controller, Get, Post, Body, Param, Put, Patch, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { ProposalStatus } from './proposal.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('repId') repId?: string,
    @Query('status') status?: ProposalStatus,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('profileId') profileId?: string,
    @Query('companyId') companyId?: string,
  ) {
    const { role } = req.user;

    // Reps can only see their own proposals — repId must be provided and valid
    if (role === 'REP') {
      const filterRepId = repId || '';
      return this.proposalsService.findByRepWithFilters(filterRepId, { status, startDate: start, endDate: end, profileId });
    }

    // Managers and admins can filter by company (cross-company view)
    if (companyId) {
      return this.proposalsService.findAll({ status, companyId });
    }

    // Managers and admins can see all or filter by rep — always scoped to their own company
    if (repId) {
      return this.proposalsService.findByRepWithFilters(repId, { status, startDate: start, endDate: end, profileId });
    }
    return this.proposalsService.findAll({ status, companyId: req.user.companyId || 'company-1' });
  }

  @Get('status-history/:proposalId')
  getStatusHistory(@Param('proposalId') proposalId: string) {
    return this.proposalsService.getStatusHistory(proposalId);
  }

  @Get(':id/funnel')
  getFunnelStats(@Param('id') repId: string) {
    return this.proposalsService.getProposalFunnelStats(repId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proposalsService.findOne(id);
  }

  @Post()
  create(@Body() createProposalDto: any, @Request() req: any) {
    return this.proposalsService.create(createProposalDto, req.user.userId, {
      companyId: req.user.companyId,
      repEmail: req.user.email,
    });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateProposalDto: any) {
    return this.proposalsService.update(id, updateProposalDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ProposalStatus,
    @Request() req: any,
  ) {
    return this.proposalsService.updateStatus(id, status, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const { role, userId } = req.user;
    if (role === 'ADMIN' || role === 'MANAGER') {
      return this.proposalsService.remove(id);
    }
    return this.proposalsService.removeByOwner(id, userId);
  }
}
