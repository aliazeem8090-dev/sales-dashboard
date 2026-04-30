import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreelancerAppliedJob } from './freelancer-applied-job.entity';

@Injectable()
export class FreelancerAppliedJobsService {
  constructor(
    @InjectRepository(FreelancerAppliedJob)
    private repo: Repository<FreelancerAppliedJob>,
  ) {}

  findByAgent(agentId: string): Promise<FreelancerAppliedJob[]> {
    return this.repo.find({ where: { agentId }, order: { appliedAt: 'DESC' } });
  }

  create(agentId: string, data: { url: string; title?: string }): Promise<FreelancerAppliedJob> {
    return this.repo.save(this.repo.create({ agentId, url: data.url, title: data.title }));
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  deleteByAgent(agentId: string): Promise<any> {
    return this.repo.delete({ agentId });
  }
}
