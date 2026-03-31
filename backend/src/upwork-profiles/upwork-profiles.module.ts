import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UpworkProfilesService } from './upwork-profiles.service';
import { UpworkProfilesController } from './upwork-profiles.controller';
import { UpworkProfile } from './upwork-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UpworkProfile])],
  controllers: [UpworkProfilesController],
  providers: [UpworkProfilesService],
  exports: [UpworkProfilesService],
})
export class UpworkProfilesModule {}
