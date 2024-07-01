import { ClaimToken } from '@/database/models/Claim';
import { WalletNetwork } from '@/database/models/Wallet';
import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
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
    nullable: true,
  })
  network!: WalletNetwork;
  @Column({
    type: 'enum',
    enum: ClaimToken,
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
}
