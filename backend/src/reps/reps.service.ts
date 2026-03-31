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

  async findAll(): Promise<Rep[]> {
    return this.repsRepository.find({ relations: ['user'] });
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
    await this.repsRepository.update(id, data);
    return this.findOne(id);
  }

  async updateConnects(id: string, currentConnects: number): Promise<Rep> {
    await this.repsRepository.update(id, { currentConnects });
    return this.findOne(id);
  }
}
