import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('freelancer_applied_job')
export class FreelancerAppliedJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  title: string;

  @CreateDateColumn()
  appliedAt: Date;
}
