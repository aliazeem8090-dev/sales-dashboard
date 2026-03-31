import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ActivityLog } from './activity-log.entity';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private logsRepository: Repository<ActivityLog>,
  ) {}

  async create(data: Partial<ActivityLog>): Promise<ActivityLog> {
    const log = this.logsRepository.create(data);
    return this.logsRepository.save(log);
  }

  async update(id: string, data: Partial<ActivityLog>): Promise<void> {
    await this.logsRepository.update(id, data);
  }

  async findByRep(repId: string, startDate?: string, endDate?: string): Promise<ActivityLog[]> {
    const where: any = { repId };
    if (startDate && endDate) {
      where.date = Between(new Date(startDate), new Date(endDate));
    }
    return this.logsRepository.find({ where, order: { date: 'DESC' } });
  }

  async getTodayLog(repId: string): Promise<ActivityLog | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.logsRepository.findOne({
      where: { repId, date: Between(today, tomorrow) },
    });
  }

  async findByDateRange(startDate: string, endDate: string): Promise<ActivityLog[]> {
    return this.logsRepository.find({
      where: { date: Between(new Date(startDate), new Date(endDate)) },
      relations: ['rep', 'rep.user'],
      order: { date: 'DESC' },
    });
  }

  async getTeamSummary(startDate: string, endDate: string): Promise<any[]> {
    const logs = await this.findByDateRange(startDate, endDate);
    const byRep: Record<string, any> = {};
    for (const log of logs) {
      if (!byRep[log.repId]) {
        byRep[log.repId] = {
          repId: log.repId,
          repName: log.rep?.user?.name || log.repId,
          totalProposalsSent: 0,
          totalLeads: 0,
          totalDeals: 0,
          totalConnectsUsed: 0,
          activeDays: 0,
        };
      }
      byRep[log.repId].totalProposalsSent += log.proposalsSent;
      byRep[log.repId].totalLeads += log.leadsGenerated;
      byRep[log.repId].totalDeals += log.dealsClosed;
      byRep[log.repId].totalConnectsUsed += log.connectsUsed;
      byRep[log.repId].activeDays += 1;
    }
    return Object.values(byRep);
  }
}
