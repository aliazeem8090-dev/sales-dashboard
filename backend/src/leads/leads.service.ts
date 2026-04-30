import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './lead.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private repo: Repository<Lead>,
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
}
