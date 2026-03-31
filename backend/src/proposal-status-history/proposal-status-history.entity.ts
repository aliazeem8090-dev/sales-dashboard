import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Proposal, ProposalStatus } from '../proposals/proposal.entity';

@Entity()
export class ProposalStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  proposalId: string;

  @Column({ type: 'enum', enum: ProposalStatus, nullable: true })
  fromStatus: ProposalStatus | null;

  @Column({ type: 'enum', enum: ProposalStatus })
  toStatus: ProposalStatus;

  @Column({ nullable: true })
  changedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  changedAt: Date;

  @ManyToOne(() => Proposal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proposalId' })
  proposal: Proposal;
}
