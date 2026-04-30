import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum LeadStatus {
  NEW           = 'NEW',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  REPLIED       = 'REPLIED',
  INTERVIEW     = 'INTERVIEW',
  HIRED         = 'HIRED',
  LOST          = 'LOST',
}

@Entity('freelancer_lead')
export class FreelancerLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @Column()
  clientName: string;

  @Column({ type: 'text', nullable: true })
  jobDescription: string;

  @Column({ type: 'text', nullable: true })
  proposal: string;

  @Column({ nullable: true })
  contactMobile: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
