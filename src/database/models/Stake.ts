import { Hero } from '@/database/models/Hero';
import { Wallet, WalletNetwork } from '@/database/models/Wallet';
import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
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
    enumName: 'network',
    nullable: true,
  })
  network!: WalletNetwork;

  @Column({ type: 'varchar', nullable: false })
  heroId!: string;

  @Column({ type: 'varchar', nullable: false })
  wallet!: string;

  @Column({ type: 'varchar', nullable: false })
  token!: string;

  @Column({ type: 'varchar', nullable: false })
  currentWallet!: string;

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

  @Column({ type: 'varchar', nullable: false })
  blockNumber!: string;

  @Column({ type: 'varchar', nullable: false })
  hash!: string;

  @ManyToOne(() => Hero, (hero) => hero.stakes)
  @JoinColumn([
    { name: 'heroId', referencedColumnName: 'id' },
    { name: 'network', referencedColumnName: 'network' },
  ])
  hero!: Hero;

  @ManyToOne(() => Wallet, (wallet) => wallet.stakes)
  @JoinColumn([
    { name: 'wallet', referencedColumnName: 'id' },
    { name: 'network', referencedColumnName: 'network' },
  ])
  walletEntity!: Hero;
}
