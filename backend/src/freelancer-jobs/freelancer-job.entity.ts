import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum JobStatus {
  FOUND     = 'FOUND',
  APPLIED   = 'APPLIED',
  VIEWED    = 'VIEWED',
  REPLIED   = 'REPLIED',
  INTERVIEW = 'INTERVIEW',
  HIRED     = 'HIRED',
  LOST      = 'LOST',
}

@Entity('freelancer_job')
export class FreelancerJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @Column({ nullable: true })
  jobTitle: string;

  @Column({ nullable: true })
  clientName: string;

  @Column({ nullable: true })
  jobUrl: string;

  @Column({ type: 'text', nullable: true })
  proposalText: string;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.FOUND })
  status: JobStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Lifecycle timestamps — set automatically on status transition
  @Column({ type: 'timestamp', nullable: true }) appliedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) viewedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) repliedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) interviewAt: Date;
  @Column({ type: 'timestamp', nullable: true }) hiredAt: Date;
  @Column({ type: 'timestamp', nullable: true }) lostAt: Date;

  // Follow-up tracking
  @Column({ type: 'timestamp', nullable: true }) lastFollowUpAt: Date;
  @Column({ default: 0 }) followUpCount: number;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
