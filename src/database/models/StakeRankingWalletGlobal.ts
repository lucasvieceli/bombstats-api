import { Wallet } from '@/database/models/Wallet';
import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stake_ranking_wallet_global')
export class StakeRankingWalletGlobal {
  @PrimaryColumn({ type: 'varchar', nullable: false })
  wallet!: string;

  @Column({ type: 'float', nullable: false })
  stake!: number;

  @Column({ type: 'float', nullable: false })
  stakeSen!: number;

  @Column({ type: 'integer', nullable: false })
  positionSen!: number;

  @Column({ type: 'integer', nullable: false })
  positionBcoin!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToOne(() => Wallet, (wallet) => wallet.stakeRankingWalletGlobal)
  @JoinColumn([{ name: 'wallet', referencedColumnName: 'walletId' }])
  walletEntity!: Wallet;
}
