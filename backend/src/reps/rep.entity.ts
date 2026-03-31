import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Rep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  managerId: string;

  @Column({ type: 'simple-json', nullable: true })
  targets: Record<string, any>;

  @Column({ default: 0 })
  currentConnects: number;

  @Column({ type: 'simple-json', nullable: true })
  weeklyGoals: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.rep)
  @JoinColumn({ name: 'userId' })
  user: User;
}
