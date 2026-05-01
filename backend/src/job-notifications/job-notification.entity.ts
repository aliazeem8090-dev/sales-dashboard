import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('job_notification')
export class JobNotification {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() jobUrl: string;
  @Column({ nullable: true }) jobTitle: string;
  @Column({ nullable: true }) repName: string;
  @Column({ nullable: true }) sourceCompanyId: string;
  @Column() targetCompanyId: string;
  @Column({ default: false }) isRead: boolean;
  @CreateDateColumn() createdAt: Date;
}
