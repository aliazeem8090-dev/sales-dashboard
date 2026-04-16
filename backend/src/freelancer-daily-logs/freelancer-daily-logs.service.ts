import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreelancerDailyLog } from './freelancer-daily-log.entity';

@Injectable()
export class FreelancerDailyLogsService {
  constructor(
    @InjectRepository(FreelancerDailyLog)
    private repo: Repository<FreelancerDailyLog>,
  ) {}

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  findByAgent(agentId: string, days = 30): Promise<FreelancerDailyLog[]> {
    return this.repo
      .createQueryBuilder('l')
      .where('l.agentId = :agentId', { agentId })
      .andWhere('l.date >= :from', {
        from: new Date(Date.now() - days * 86400000).toISOString().split('T')[0],
      })
      .orderBy('l.date', 'DESC')
      .getMany();
  }

  getTodayLog(agentId: string): Promise<FreelancerDailyLog | null> {
    return this.repo.findOne({ where: { agentId, date: this.today() as any } });
  }

  async upsertToday(agentId: string, data: Partial<FreelancerDailyLog>): Promise<FreelancerDailyLog> {
    const today = this.today();
    let log = await this.repo.findOne({ where: { agentId, date: today as any } });
    if (log) {
      Object.assign(log, data);
      return this.repo.save(log);
    }
    return this.repo.save(this.repo.create({ agentId, date: today, ...data }));
  }

  async addManagerComment(agentId: string, date: string, comment: string): Promise<FreelancerDailyLog | null> {
    const log = await this.repo.findOne({ where: { agentId, date: date as any } });
    if (!log) return null;
    log.managerComment = comment;
    return this.repo.save(log);
  }
}
