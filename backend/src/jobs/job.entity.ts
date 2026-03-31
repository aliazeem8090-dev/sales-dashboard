import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  upworkJobUrl: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  clientBudget: string;

  @Column({ nullable: true })
  category: string;

  @Column('simple-array', { nullable: true })
  skills: string[];

  @Column({ type: 'date', nullable: true })
  postedDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('simple-array', { nullable: true })
  fitTags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
