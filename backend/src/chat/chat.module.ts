import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Benchmark } from '../benchmarks/benchmark.entity';
import { ProposalReview } from '../proposal-reviews/proposal-review.entity';
import { Rep } from '../reps/rep.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Benchmark, ProposalReview, Rep])],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
