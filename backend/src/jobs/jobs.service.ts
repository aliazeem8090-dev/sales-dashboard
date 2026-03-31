import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './job.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
  ) {}

  async findAll(): Promise<Job[]> {
    return this.jobsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  async findByCategory(category: string): Promise<Job[]> {
    return this.jobsRepository.find({ where: { category } });
  }

  async findOrCreate(data: Partial<Job>): Promise<Job> {
    const existing = await this.jobsRepository.findOne({ where: { upworkJobUrl: data.upworkJobUrl } });
    if (existing) return existing;
    const job = this.jobsRepository.create(data);
    return this.jobsRepository.save(job);
  }

  async create(data: Partial<Job>): Promise<Job> {
    const job = this.jobsRepository.create(data);
    return this.jobsRepository.save(job);
  }

  async update(id: string, data: Partial<Job>): Promise<Job> {
    await this.jobsRepository.update(id, data);
    return this.findOne(id);
  }
}
