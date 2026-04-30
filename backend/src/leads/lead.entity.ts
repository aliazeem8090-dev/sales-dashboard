import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Rep } from '../reps/rep.entity';

@Entity()
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  repId: string;

  @Column({ nullable: true })
  proposalId: string;

  @Column({ nullable: true })
  companyId: string;

  @Column()
  clientName: string;

  @Column({ nullable: true })
  companyName: string;

  @Column({ type: 'text', nullable: true })
  clientMessage: string;

  @Column({ nullable: true })
  persona: string;

  @Column({ nullable: true })
  rate: string;

  @Column({ nullable: true })
  clientContactInfo: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Rep)
  @JoinColumn({ name: 'repId' })
  rep: Rep;
}
