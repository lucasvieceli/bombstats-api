import { Wallet, WalletNetwork } from '@/database/models/Wallet';
import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stake_ranking_wallet')
export class StakeRankingWallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'float', nullable: false })
  stake!: number;

  @Column({ type: 'float', nullable: false })
  stakeSen!: number;

  @Column({
    type: 'enum',
    enum: WalletNetwork,
    enumName: 'network',
    nullable: true,
  })
  network!: WalletNetwork;

  @Column({ type: 'varchar', nullable: false })
  wallet!: string;

  @Column({ type: 'integer', nullable: false })
  position!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToOne(() => Wallet, (wallet) => wallet.stakeRankingWallet)
  @JoinColumn([
    { name: 'wallet', referencedColumnName: 'walletId' },
    { name: 'network', referencedColumnName: 'network' },
  ])
  walletEntity!: Wallet;
}
