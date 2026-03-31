import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { UpworkProfile } from '../upwork-profiles/upwork-profile.entity';

@Entity()
export class BidderAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bidderId: string;

  @Column()
  profileId: string;

  @Column({ nullable: true })
  assignedBy: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  assignedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'bidderId' })
  bidder: User;

  @ManyToOne(() => UpworkProfile)
  @JoinColumn({ name: 'profileId' })
  profile: UpworkProfile;
}
