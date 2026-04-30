import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { Rep } from '../reps/rep.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Rep])],
  providers: [LeadsService],
  controllers: [LeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}
