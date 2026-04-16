import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum LeadStatus {
  SEARCHED    = 'SEARCHED',
  CONTACTED   = 'CONTACTED',
  REPLIED     = 'REPLIED',
  FOLLOWED_UP = 'FOLLOWED_UP',
  CONVERTED   = 'CONVERTED',
  REJECTED    = 'REJECTED',
}

@Entity('linkedin_lead')
export class LinkedInLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  company: string;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.SEARCHED })
  status: LeadStatus;

  @Column({ nullable: true })
  source: string;

  @Column({ type: 'timestamp', nullable: true }) contactedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) repliedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) lastFollowUpAt: Date;
  @Column({ type: 'timestamp', nullable: true }) convertedAt: Date;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
