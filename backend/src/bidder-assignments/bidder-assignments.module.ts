import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BidderAssignment } from './bidder-assignment.entity';
import { BidderAssignmentsService } from './bidder-assignments.service';
import { BidderAssignmentsController } from './bidder-assignments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BidderAssignment])],
  controllers: [BidderAssignmentsController],
  providers: [BidderAssignmentsService],
  exports: [BidderAssignmentsService],
})
export class BidderAssignmentsModule {}
