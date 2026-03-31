import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Rep } from '../reps/rep.entity';

export enum InsightType {
  PERFORMANCE = 'PERFORMANCE',
  PROPOSAL_QUALITY = 'PROPOSAL_QUALITY',
  ACTIVITY = 'ACTIVITY',
  PROFILE_FIT = 'PROFILE_FIT',
  MANAGER_NOTE = 'MANAGER_NOTE',
}

export enum InsightSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity()
export class CoachingInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  repId: string;

  @Column({ type: 'enum', enum: InsightType })
  insightType: InsightType;

  @Column({ type: 'text' })
  generatedInsight: string;

  @Column({ type: 'enum', enum: InsightSeverity, default: InsightSeverity.MEDIUM })
  severity: InsightSeverity;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Rep)
  @JoinColumn({ name: 'repId' })
  rep: Rep;
}
