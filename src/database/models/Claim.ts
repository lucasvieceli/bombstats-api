import { WalletNetwork } from '@/database/models/Wallet';
import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ClaimToken {
  BCOIN = 'BCOIN',
  SEN = 'SEN',
}

@Entity('claim')
export class Claim {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'float', nullable: false })
  amount!: number;

  @Column({
    type: 'enum',
    enum: WalletNetwork,
    enumName: 'network',
    nullable: true,
  })
  network!: WalletNetwork;

  @Column({
    type: 'enum',
    enum: ClaimToken,
    enumName: 'token',
    nullable: true,
  })
  token!: ClaimToken;

  @Column({ type: 'varchar', nullable: false })
  wallet!: string;

  @Column({ type: 'varchar', nullable: false })
  tokenSymbol!: string;

  @Column({ type: 'varchar', nullable: false })
  blockNumber!: string;

  @Column({ type: 'varchar', nullable: false })
  hash!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
