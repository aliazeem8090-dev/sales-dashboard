import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ProposalReviewsService } from './proposal-reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('proposal-reviews')
@UseGuards(JwtAuthGuard)
export class ProposalReviewsController {
  constructor(private readonly proposalReviewsService: ProposalReviewsService) {}

  @Post()
  create(@Body() body: any) {
    return this.proposalReviewsService.create(body);
  }

  @Get('proposal/:proposalId')
  findByProposal(@Param('proposalId') proposalId: string) {
    return this.proposalReviewsService.findByProposal(proposalId);
  }

  @Get('proposal/:proposalId/latest')
  findLatest(@Param('proposalId') proposalId: string) {
    return this.proposalReviewsService.findLatest(proposalId);
  }
}
