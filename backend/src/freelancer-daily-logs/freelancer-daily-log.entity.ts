import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('freelancer_daily_log')
export class FreelancerDailyLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: 0 }) jobsFound: number;
  @Column({ default: 0 }) jobsFiltered: number;
  @Column({ default: 0 }) proposalsSent: number;
  @Column({ default: 0 }) clientReplies: number;
  @Column({ default: 0 }) followUpsSent: number;
  @Column({ default: 0 }) interviewsBooked: number;
  @Column({ default: 0 }) dealsClosed: number;

  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ type: 'text', nullable: true }) managerComment: string;

  @CreateDateColumn() createdAt: Date;
}
