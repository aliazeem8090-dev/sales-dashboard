import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Benchmark, ProfileType } from './benchmark.entity';

@Injectable()
export class BenchmarksService {
  constructor(
    @InjectRepository(Benchmark)
    private benchmarksRepository: Repository<Benchmark>,
  ) {}

  async findAll(): Promise<Benchmark[]> {
    return this.benchmarksRepository.find();
  }

  async findOne(id: string): Promise<Benchmark> {
    const benchmark = await this.benchmarksRepository.findOne({ where: { id } });
    if (!benchmark) throw new NotFoundException(`Benchmark ${id} not found`);
    return benchmark;
  }

  async findByProfile(profileType: ProfileType): Promise<Benchmark | null> {
    return this.benchmarksRepository.findOne({ where: { profileType } });
  }

  async create(data: Partial<Benchmark>): Promise<Benchmark> {
    const benchmark = this.benchmarksRepository.create(data);
    return this.benchmarksRepository.save(benchmark);
  }

  async update(id: string, data: Partial<Benchmark>): Promise<Benchmark> {
    await this.benchmarksRepository.update(id, data);
    return this.findOne(id);
  }
}
