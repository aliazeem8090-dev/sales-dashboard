import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkedInAgent } from './linkedin-agent.entity';

@Injectable()
export class LinkedInAgentsService {
  constructor(
    @InjectRepository(LinkedInAgent)
    private repo: Repository<LinkedInAgent>,
  ) {}

  findAll(): Promise<LinkedInAgent[]> {
    return this.repo.find({ relations: ['user'] });
  }

  async findOne(id: string): Promise<LinkedInAgent> {
    const a = await this.repo.findOne({ where: { id }, relations: ['user'] });
    if (!a) throw new NotFoundException(`Agent ${id} not found`);
    return a;
  }

  findByUserId(userId: string): Promise<LinkedInAgent | null> {
    return this.repo.findOne({ where: { userId }, relations: ['user'] });
  }

  create(data: Partial<LinkedInAgent>): Promise<LinkedInAgent> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<LinkedInAgent>): Promise<LinkedInAgent> {
    const agent = await this.findOne(id);
    Object.assign(agent, data);
    return this.repo.save(agent);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async removeByUserId(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
