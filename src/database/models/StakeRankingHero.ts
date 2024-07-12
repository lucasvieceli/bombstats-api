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
  amount!: number;

  @Column({ type: 'int', nullable: false })
  rarity!: number;

  @Column({
    type: 'enum',
    enum: WalletNetwork,
    nullable: true,
  })
  network!: WalletNetwork;

  @Column({ type: 'varchar', nullable: false })
  wallet!: string;

  @Column({ type: 'varchar', nullable: false })
  heroId!: string;

  @Column({ type: 'integer', nullable: false })
  position!: number;

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
