import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreelancerLead, LeadStatus } from './freelancer-lead.entity';

@Injectable()
export class FreelancerLeadsService {
  constructor(
    @InjectRepository(FreelancerLead)
    private repo: Repository<FreelancerLead>,
  ) {}

  findByAgent(agentId: string): Promise<FreelancerLead[]> {
    return this.repo.find({ where: { agentId }, order: { createdAt: 'DESC' } });
  }

  create(agentId: string, data: Partial<FreelancerLead>): Promise<FreelancerLead> {
    return this.repo.save(this.repo.create({ ...data, agentId, status: data.status || LeadStatus.NEW }));
  }

  async update(id: string, data: Partial<FreelancerLead>): Promise<FreelancerLead> {
    const lead = await this.repo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    Object.assign(lead, data);
    return this.repo.save(lead);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  deleteByAgent(agentId: string): Promise<any> {
    return this.repo.delete({ agentId });
  }
}
