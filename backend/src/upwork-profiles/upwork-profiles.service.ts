import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpworkProfile } from './upwork-profile.entity';

@Injectable()
export class UpworkProfilesService {
  constructor(
    @InjectRepository(UpworkProfile)
    private profilesRepository: Repository<UpworkProfile>,
  ) {}

  async findAll(): Promise<UpworkProfile[]> {
    return this.profilesRepository.find();
  }

  async findOne(id: string): Promise<UpworkProfile> {
    const profile = await this.profilesRepository.findOne({ where: { id } });
    if (!profile) throw new NotFoundException(`Profile ${id} not found`);
    return profile;
  }

  async findByNiche(niche: string): Promise<UpworkProfile[]> {
    return this.profilesRepository.find({ where: { niche } });
  }

  async create(data: Partial<UpworkProfile>): Promise<UpworkProfile> {
    const profile = this.profilesRepository.create(data);
    return this.profilesRepository.save(profile);
  }

  async update(id: string, data: Partial<UpworkProfile>): Promise<UpworkProfile> {
    await this.profilesRepository.update(id, data);
    return this.findOne(id);
  }
}
