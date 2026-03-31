import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BenchmarksService } from './benchmarks.service';
import { BenchmarksController } from './benchmarks.controller';
import { Benchmark } from './benchmark.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Benchmark])],
  controllers: [BenchmarksController],
  providers: [BenchmarksService],
  exports: [BenchmarksService],
})
export class BenchmarksModule {}
