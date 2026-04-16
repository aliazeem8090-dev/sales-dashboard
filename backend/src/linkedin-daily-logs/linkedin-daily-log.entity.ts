import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('linkedin_daily_log')
export class LinkedInDailyLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: 0 }) leadsSearched: number;
  @Column({ default: 0 }) leadsFiltered: number;
  @Column({ default: 0 }) leadsAnalyzed: number;
  @Column({ default: 0 }) inMailsSent: number;
  @Column({ default: 0 }) connectionsSent: number;
  @Column({ default: 0 }) jobsApplied: number;
  @Column({ default: 0 }) repliesReceived: number;
  @Column({ default: 0 }) followUpsSent: number;
  @Column({ default: 0 }) emailsChecked: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
