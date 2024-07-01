import { WalletNetwork } from '@/database/models/Wallet';
import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stake')
export class Stake {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'float', nullable: false })
  amount!: number;

  @Column({
    type: 'enum',
    enum: WalletNetwork,
    nullable: true,
  })
  network!: WalletNetwork;

  @Column({ type: 'varchar', nullable: false })
  heroId!: string;

  @Column({ type: 'varchar', nullable: false })
  wallet!: string;

  @Column({ type: 'int', nullable: true })
  rarity!: number | null;

  @Column({ type: 'int', nullable: false, default: 0 })
  withdraw!: number;

  @Column({ type: 'timestamp', nullable: false })
  date!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
