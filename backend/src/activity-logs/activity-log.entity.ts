import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Rep } from '../reps/rep.entity';

@Entity()
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  repId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ default: 0 })
  proposalsSent: number;

  @Column({ default: 0 })
  leadsGenerated: number;

  @Column({ default: 0 })
  dealsClosed: number;

  @Column({ default: 0 })
  connectsUsed: number;

  @Column({ default: 0 })
  remainingConnects: number;

  @Column({ type: 'text', nullable: true })
  challengesFaced: string;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Rep)
  @JoinColumn({ name: 'repId' })
  rep: Rep;
}
