// backend/src/proposals/proposal.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Rep } from '../reps/rep.entity';
import { Job } from '../jobs/job.entity';
import { UpworkProfile } from '../upwork-profiles/upwork-profile.entity';
import { ProposalReview } from '../proposal-reviews/proposal-review.entity';

export enum ProposalStatus {
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  REPLIED = 'REPLIED',
  INTERVIEW = 'INTERVIEW',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  LOST = 'LOST',
}

@Entity()
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  repId: string;

  @Column()
  jobId: string;

  @Column('text')
  fullProposalText: string;

  @Column({ type: 'timestamp' })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  viewedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  repliedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  interviewAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  hiredAt: Date;

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.SENT,
  })
  status: ProposalStatus;

  @Column({ default: 0 })
  connectsUsed: number;

  @Column({ nullable: true })
  profileUsedId: string;

  @Column({ type: 'float', nullable: true })
  contractValue: number;

  @Column({ type: 'float', nullable: true })
  aiScore: number;

  @Column({ type: 'float', nullable: true })
  manualScore: number;

  @Column({ type: 'text', nullable: true })
  improvementNotes: string;

  @Column({ type: 'text', nullable: true })
  lostReason: string;

  @Column({ default: 0 })
  boardOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Rep)
  @JoinColumn({ name: 'repId' })
  rep: Rep;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => UpworkProfile, { nullable: true })
  @JoinColumn({ name: 'profileUsedId' })
  profileUsed: UpworkProfile;

  @OneToMany(() => ProposalReview, review => review.proposal)
  reviews: ProposalReview[];
}