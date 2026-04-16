import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkedInLead, LeadStatus } from './linkedin-lead.entity';

@Injectable()
export class LinkedInLeadsService {
  constructor(
    @InjectRepository(LinkedInLead)
    private repo: Repository<LinkedInLead>,
  ) {}

  findByAgent(agentId: string): Promise<LinkedInLead[]> {
    return this.repo.find({ where: { agentId }, order: { createdAt: 'DESC' } });
  }

  findOne(id: string): Promise<LinkedInLead | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(agentId: string, data: Partial<LinkedInLead>): Promise<LinkedInLead> {
    return this.repo.save(this.repo.create({ ...data, agentId }));
  }

  async update(id: string, data: Partial<LinkedInLead>): Promise<LinkedInLead> {
    const lead = await this.repo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (data.status === LeadStatus.CONTACTED && !lead.contactedAt)
      data.contactedAt = new Date();
    if (data.status === LeadStatus.REPLIED && !lead.repliedAt)
      data.repliedAt = new Date();
    if (data.status === LeadStatus.FOLLOWED_UP)
      data.lastFollowUpAt = new Date();
    if (data.status === LeadStatus.CONVERTED && !lead.convertedAt)
      data.convertedAt = new Date();
    Object.assign(lead, data);
    return this.repo.save(lead);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async getFollowUpRequired(agentId: string): Promise<LinkedInLead[]> {
    const cutoff = new Date(Date.now() - 4 * 86400000);
    const leads = await this.repo.find({ where: { agentId } });
    return leads.filter(
      l => l.status === LeadStatus.CONTACTED &&
           l.contactedAt && new Date(l.contactedAt) < cutoff,
    );
  }
}
