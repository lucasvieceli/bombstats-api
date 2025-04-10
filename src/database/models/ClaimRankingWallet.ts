import { ClaimToken } from '@/database/models/Claim';
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

@Entity('claim_ranking_wallet')
export class ClaimRankingWallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @Column({ type: 'integer', nullable: false })
  position!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToOne(() => Wallet, (wallet) => wallet.claimRankingWallet)
  @JoinColumn([
    { name: 'wallet', referencedColumnName: 'walletId' },
    { name: 'network', referencedColumnName: 'network' },
  ])
  walletEntity!: Wallet;
}
