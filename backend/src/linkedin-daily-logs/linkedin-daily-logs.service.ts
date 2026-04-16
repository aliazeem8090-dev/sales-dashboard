import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkedInDailyLog } from './linkedin-daily-log.entity';

@Injectable()
export class LinkedInDailyLogsService {
  constructor(
    @InjectRepository(LinkedInDailyLog)
    private repo: Repository<LinkedInDailyLog>,
  ) {}

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  findByAgent(agentId: string, days = 30): Promise<LinkedInDailyLog[]> {
    return this.repo
      .createQueryBuilder('l')
      .where('l.agentId = :agentId', { agentId })
      .andWhere('l.date >= :from', {
        from: new Date(Date.now() - days * 86400000).toISOString().split('T')[0],
      })
      .orderBy('l.date', 'DESC')
      .getMany();
  }

  getTodayLog(agentId: string): Promise<LinkedInDailyLog | null> {
    return this.repo.findOne({ where: { agentId, date: this.today() as any } });
  }

  async upsertToday(agentId: string, data: Partial<LinkedInDailyLog>): Promise<LinkedInDailyLog> {
    const today = this.today();
    let log = await this.repo.findOne({ where: { agentId, date: today as any } });
    if (log) {
      Object.assign(log, data);
      return this.repo.save(log);
    }
    return this.repo.save(this.repo.create({ agentId, date: today, ...data }));
  }

  async getMonthlyInMails(agentId: string): Promise<number> {
    const d = new Date();
    d.setDate(1); d.setHours(0, 0, 0, 0);
    const from = d.toISOString().split('T')[0];
    const logs = await this.repo
      .createQueryBuilder('l')
      .where('l.agentId = :agentId', { agentId })
      .andWhere('l.date >= :from', { from })
      .getMany();
    return logs.reduce((s, l) => s + (l.inMailsSent || 0), 0);
  }
}
