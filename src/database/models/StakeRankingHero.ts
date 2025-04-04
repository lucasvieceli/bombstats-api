import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
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

@Entity('stake_ranking_hero')
export class StakeRankingHero {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'float', nullable: false })
  stake!: number;

  @Column({ type: 'float', nullable: false })
  stakeSen!: number;

  @Column({ type: 'int', nullable: false })
  rarity!: number;

  @Column({
    type: 'enum',
    enum: WalletNetwork,
    enumName: 'network',
    nullable: true,
  })
  network!: WalletNetwork;

  @Column({ type: 'varchar', nullable: false })
  wallet!: string;

  @Column({ type: 'varchar', nullable: false })
  heroId!: string;

  @Column({ type: 'integer', nullable: false })
  positionBcoin!: number;

  @Column({ type: 'integer', nullable: false })
  positionSen!: number;

  @Column({ type: 'integer', nullable: false })
  positionBcoinGlobal!: number;

  @Column({ type: 'integer', nullable: false })
  positionSenGlobal!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToOne(() => Hero, (hero) => hero.stakeRankingHero)
  @JoinColumn([
    { name: 'heroId', referencedColumnName: 'id' },
    { name: 'network', referencedColumnName: 'network' },
  ])
  hero!: Hero;
}
