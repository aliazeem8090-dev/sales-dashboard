import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreelancerAgent } from './freelancer-agent.entity';

@Injectable()
export class FreelancerAgentsService {
  constructor(
    @InjectRepository(FreelancerAgent)
    private repo: Repository<FreelancerAgent>,
  ) {}

  findAll(): Promise<FreelancerAgent[]> {
    return this.repo.find({ relations: ['user'] });
  }

  async findOne(id: string): Promise<FreelancerAgent> {
    const a = await this.repo.findOne({ where: { id }, relations: ['user'] });
    if (!a) throw new NotFoundException(`Freelancer agent ${id} not found`);
    return a;
  }

  findByUserId(userId: string): Promise<FreelancerAgent | null> {
    return this.repo.findOne({ where: { userId }, relations: ['user'] });
  }

  create(data: Partial<FreelancerAgent>): Promise<FreelancerAgent> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<FreelancerAgent>): Promise<FreelancerAgent> {
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
