import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BidderAssignment } from './bidder-assignment.entity';

@Injectable()
export class BidderAssignmentsService {
  constructor(
    @InjectRepository(BidderAssignment)
    private repo: Repository<BidderAssignment>,
  ) {}

  async assign(bidderId: string, profileId: string, assignedBy: string) {
    const existing = await this.repo.findOne({ where: { bidderId, profileId } });
    if (existing) {
      existing.isActive = true;
      existing.assignedBy = assignedBy;
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create({ bidderId, profileId, assignedBy }));
  }

  async unassign(bidderId: string, profileId: string) {
    const existing = await this.repo.findOne({ where: { bidderId, profileId } });
    if (existing) {
      existing.isActive = false;
      return this.repo.save(existing);
    }
    return null;
  }

  async getByBidder(bidderId: string) {
    return this.repo.find({
      where: { bidderId, isActive: true },
      relations: ['profile'],
    });
  }

  async getByProfile(profileId: string) {
    return this.repo.find({
      where: { profileId, isActive: true },
      relations: ['bidder'],
    });
  }

  async getAllAssignments(companyId?: string) {
    if (!companyId) {
      return this.repo.find({
        where: { isActive: true },
        relations: ['bidder', 'profile'],
        order: { assignedAt: 'DESC' },
      });
    }
    return this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.bidder', 'bidder')
      .leftJoinAndSelect('a.profile', 'profile')
      .where('a.isActive = :active', { active: true })
      .andWhere('bidder.companyId = :companyId', { companyId })
      .orderBy('a.assignedAt', 'DESC')
      .getMany();
  }
}
