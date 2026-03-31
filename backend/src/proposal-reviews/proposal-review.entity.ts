import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Proposal } from '../proposals/proposal.entity';

@Entity()
export class ProposalReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  proposalId: string;

  @Column({ type: 'float', nullable: true })
  overallScore: number;

  @Column({ type: 'simple-json', nullable: true })
  parameterScores: Record<string, number>;

  @Column('simple-array', { nullable: true })
  missingElements: string[];

  @Column({ type: 'text', nullable: true })
  rewrittenVersion: string;

  @Column('simple-array', { nullable: true })
  suggestions: string[];

  @Column({ type: 'text', nullable: true })
  improvedHook: string;

  @Column({ type: 'simple-json', nullable: true })
  modelOutputSnapshot: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Proposal, proposal => proposal.reviews)
  @JoinColumn({ name: 'proposalId' })
  proposal: Proposal;
}
