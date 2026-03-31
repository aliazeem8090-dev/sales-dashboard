import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProposalStatusHistory } from './proposal-status-history.entity';
import { ProposalStatusHistoryService } from './proposal-status-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProposalStatusHistory])],
  providers: [ProposalStatusHistoryService],
  exports: [ProposalStatusHistoryService],
})
export class ProposalStatusHistoryModule {}
