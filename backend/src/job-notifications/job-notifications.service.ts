import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobNotification } from './job-notification.entity';

@Injectable()
export class JobNotificationsService {
  constructor(
    @InjectRepository(JobNotification)
    private repo: Repository<JobNotification>,
  ) {}

  create(data: Partial<JobNotification>): Promise<JobNotification> {
    return this.repo.save(this.repo.create(data));
  }

  findForCompany(companyId: string): Promise<JobNotification[]> {
    return this.repo.find({
      where: { targetCompanyId: companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadCount(companyId: string): Promise<number> {
    return this.repo.count({ where: { targetCompanyId: companyId, isRead: false } });
  }

  async markRead(id: string): Promise<void> {
    await this.repo.update(id, { isRead: true });
  }

  async markAllRead(companyId: string): Promise<void> {
    await this.repo.update({ targetCompanyId: companyId, isRead: false }, { isRead: true });
  }
}
