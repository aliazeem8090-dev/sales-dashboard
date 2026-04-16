import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreelancerJob, JobStatus } from './freelancer-job.entity';

@Injectable()
export class FreelancerJobsService {
  constructor(
    @InjectRepository(FreelancerJob)
    private repo: Repository<FreelancerJob>,
  ) {}

  findByAgent(agentId: string): Promise<FreelancerJob[]> {
    return this.repo.find({ where: { agentId }, order: { createdAt: 'DESC' } });
  }

  findOne(id: string): Promise<FreelancerJob | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(agentId: string, data: Partial<FreelancerJob>): Promise<FreelancerJob> {
    return this.repo.save(this.repo.create({ ...data, agentId }));
  }

  async update(id: string, data: Partial<FreelancerJob>): Promise<FreelancerJob> {
    const job = await this.repo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    // Auto-set lifecycle timestamps on status change
    if (data.status && data.status !== job.status) {
      const now = new Date();
      if (data.status === JobStatus.APPLIED   && !job.appliedAt)   data.appliedAt   = now;
      if (data.status === JobStatus.VIEWED    && !job.viewedAt)    data.viewedAt    = now;
      if (data.status === JobStatus.REPLIED   && !job.repliedAt)   data.repliedAt   = now;
      if (data.status === JobStatus.INTERVIEW && !job.interviewAt) data.interviewAt = now;
      if (data.status === JobStatus.HIRED     && !job.hiredAt)     data.hiredAt     = now;
      if (data.status === JobStatus.LOST      && !job.lostAt)      data.lostAt      = now;
    }

    Object.assign(job, data);
    return this.repo.save(job);
  }

  async markFollowUp(id: string): Promise<FreelancerJob> {
    const job = await this.repo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    job.lastFollowUpAt = new Date();
    job.followUpCount = (job.followUpCount || 0) + 1;
    return this.repo.save(job);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async getFollowUpRequired(agentId: string): Promise<FreelancerJob[]> {
    const cutoff = new Date(Date.now() - 4 * 86400000);
    const followUpCutoff = new Date(Date.now() - 3 * 86400000);
    const jobs = await this.repo.find({ where: { agentId } });
    return jobs.filter(j =>
      [JobStatus.APPLIED, JobStatus.VIEWED].includes(j.status) &&
      j.appliedAt && new Date(j.appliedAt) < cutoff &&
      (!j.lastFollowUpAt || new Date(j.lastFollowUpAt) < followUpCutoff),
    );
  }
}
