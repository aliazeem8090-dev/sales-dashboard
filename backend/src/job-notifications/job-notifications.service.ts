import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobNotification } from './job-notification.entity';
import { User } from '../users/user.entity';

function normalize(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

@Injectable()
export class JobNotificationsService {
  constructor(
    @InjectRepository(JobNotification)
    private repo: Repository<JobNotification>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  create(data: Partial<JobNotification>): Promise<JobNotification> {
    return this.repo.save(this.repo.create(data));
  }

  async createForManagers(
    data: Partial<JobNotification>,
    targetCompanyId: string,
  ): Promise<JobNotification[]> {
    const normalizedTargetCompanyId = normalize(targetCompanyId);
    const managers = await this.usersRepo
      .createQueryBuilder('u')
      .where('LOWER(u.companyId) = :companyId', { companyId: normalizedTargetCompanyId })
      .andWhere('LOWER(u.role) = :role', { role: 'manager' })
      .getMany();

    if (managers.length === 0) return [];

    const notifications = managers.map((manager) =>
      this.repo.create({
        ...data,
        sourceCompanyId: normalize(data.sourceCompanyId),
        targetCompanyId: normalizedTargetCompanyId,
        targetUserId: manager.id,
      }),
    );

    return this.repo.save(notifications);
  }

  findForUser(companyId: string, userId: string): Promise<JobNotification[]> {
    const normalizedCompanyId = normalize(companyId);
    return this.repo
      .createQueryBuilder('notification')
      .where('LOWER(notification.targetCompanyId) = :companyId', { companyId: normalizedCompanyId })
      .andWhere('(notification.targetUserId = :userId OR notification.targetUserId IS NULL)', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .getMany();
  }

  findForCompany(companyId: string): Promise<JobNotification[]> {
    const normalizedCompanyId = normalize(companyId);
    return this.repo
      .createQueryBuilder('notification')
      .where('LOWER(notification.targetCompanyId) = :companyId', { companyId: normalizedCompanyId })
      .orderBy('notification.createdAt', 'DESC')
      .getMany();
  }

  async getUnreadCount(companyId: string): Promise<number> {
    const normalizedCompanyId = normalize(companyId);
    return this.repo
      .createQueryBuilder('notification')
      .where('LOWER(notification.targetCompanyId) = :companyId', { companyId: normalizedCompanyId })
      .andWhere('notification.isRead = :isRead', { isRead: false })
      .getCount();
  }

  async getUnreadCountForUser(companyId: string, userId: string): Promise<number> {
    const normalizedCompanyId = normalize(companyId);
    return this.repo
      .createQueryBuilder('notification')
      .where('LOWER(notification.targetCompanyId) = :companyId', { companyId: normalizedCompanyId })
      .andWhere('(notification.targetUserId = :userId OR notification.targetUserId IS NULL)', { userId })
      .andWhere('notification.isRead = :isRead', { isRead: false })
      .getCount();
  }

  async markRead(id: string): Promise<void> {
    await this.repo.update(id, { isRead: true });
  }

  async markAllRead(companyId: string): Promise<void> {
    const normalizedCompanyId = normalize(companyId);
    await this.repo
      .createQueryBuilder()
      .update(JobNotification)
      .set({ isRead: true })
      .where('LOWER(targetCompanyId) = :companyId', { companyId: normalizedCompanyId })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();
  }

  async markAllReadForUser(companyId: string, userId: string): Promise<void> {
    const normalizedCompanyId = normalize(companyId);
    await this.repo
      .createQueryBuilder()
      .update(JobNotification)
      .set({ isRead: true })
      .where('LOWER(targetCompanyId) = :companyId', { companyId: normalizedCompanyId })
      .andWhere('(targetUserId = :userId OR targetUserId IS NULL)', { userId })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();
  }
}
