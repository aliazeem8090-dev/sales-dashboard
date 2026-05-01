import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rep } from './rep.entity';

@Injectable()
export class RepsService {
  constructor(
    @InjectRepository(Rep)
    private repsRepository: Repository<Rep>,
  ) {}

  async findAll(companyId?: string): Promise<Rep[]> {
    const company = companyId || 'company-1';
    const qb = this.repsRepository
      .createQueryBuilder('rep')
      .leftJoinAndSelect('rep.user', 'user');
    if (company === 'company-1') {
      qb.where('(user.companyId = :company OR user.companyId IS NULL)', { company });
    } else {
      qb.where('user.companyId = :company', { company });
    }
    return qb.getMany();
  }

  async findOne(id: string): Promise<Rep> {
    const rep = await this.repsRepository.findOne({ where: { id }, relations: ['user'] });
    if (!rep) throw new NotFoundException(`Rep ${id} not found`);
    return rep;
  }

  async findByUserId(userId: string): Promise<Rep | null> {
    return this.repsRepository.findOne({ where: { userId }, relations: ['user'] });
  }

  async create(data: Partial<Rep>): Promise<Rep> {
    const rep = this.repsRepository.create(data);
    return this.repsRepository.save(rep);
  }

  async update(id: string, data: Partial<Rep>): Promise<Rep> {
    const rep = await this.findOne(id);
    Object.assign(rep, data);
    await this.repsRepository.save(rep);
    return this.findOne(id);
  }

  async updateConnects(id: string, currentConnects: number): Promise<Rep> {
    await this.repsRepository.update(id, { currentConnects });
    return this.findOne(id);
  }
}
