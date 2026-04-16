// backend/src/users/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Rep } from '../reps/rep.entity';

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  REP = 'REP',
  LEAD = 'LEAD',
  LINKEDIN_AGENT = 'LINKEDIN_AGENT',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.REP,
  })
  role: Role;

  @Column({ nullable: true })
  assignedProfileId: string;

  @Column({ default: true })
  activeStatus: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Rep, (rep) => rep.user, { nullable: true })
  rep: Rep;
}