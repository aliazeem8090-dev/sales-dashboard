import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProposalReviewsService } from './proposal-reviews.service';
import { ProposalReviewsController } from './proposal-reviews.controller';
import { ProposalReview } from './proposal-review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProposalReview])],
  controllers: [ProposalReviewsController],
  providers: [ProposalReviewsService],
  exports: [ProposalReviewsService],
})
export class ProposalReviewsModule {}
