import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './lead.entity';
import { Rep } from '../reps/rep.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private repo: Repository<Lead>,
    @InjectRepository(Rep)
    private repsRepo: Repository<Rep>,
  ) {}

  async create(data: Partial<Lead>): Promise<Lead> {
    return this.repo.save(this.repo.create(data));
  }

  async findByCompany(companyId: string): Promise<Lead[]> {
    return this.repo.find({
      where: { companyId },
      relations: ['rep', 'rep.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserId(userId: string): Promise<Lead[]> {
    const rep = await this.repsRepo.findOne({ where: { userId } });
    if (!rep) return [];
    return this.repo.find({
      where: { repId: rep.id },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, data: Partial<Lead>): Promise<Lead> {
    const lead = await this.repo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } }) as Promise<Lead>;
  }
}
