import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepsService } from './reps.service';
import { RepsController } from './reps.controller';
import { Rep } from './rep.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rep])],
  controllers: [RepsController],
  providers: [RepsService],
  exports: [RepsService],
})
export class RepsModule {}
