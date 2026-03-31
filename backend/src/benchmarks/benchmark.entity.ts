import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProfileType {
  MERN = 'MERN',
  LARAVEL = 'LARAVEL',
  AI_ML = 'AI_ML',
  WORDPRESS = 'WORDPRESS',
  GENERAL = 'GENERAL',
}

@Entity()
export class Benchmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ProfileType, default: ProfileType.GENERAL })
  profileType: ProfileType;

  @Column({ type: 'simple-json', nullable: true })
  scoringWeights: Record<string, number>;

  @Column({ type: 'simple-json', nullable: true })
  minimumStandards: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  profileSpecificGuidance: string;

  @Column('simple-array', { nullable: true })
  proposalTemplates: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
