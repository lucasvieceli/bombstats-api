import { Stake } from '@/database/models/Stake';
import { StakeRankingHero } from '@/database/models/StakeRankingHero';
import { WalletNetwork } from '@/database/models/Wallet';
import 'reflect-metadata';
import {
  AfterLoad,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MarketPlace {
  OPENSEA = 'opensea',
  MARKET = 'market',
}

@Entity('hero')
export class Hero {
  @PrimaryColumn({
    type: 'varchar',
  })
  id!: string;

  @PrimaryColumn({
    type: 'enum',
    enumName: 'network',
    enum: WalletNetwork,
  })
  network!: WalletNetwork;

  @Column({ type: 'int', nullable: true })
  index: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  rarity: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  raritySimbol: string;

  @Column({ type: 'int', nullable: true })
  rarityIndex: number;

  @Column({ type: 'int', nullable: true })
  level: number;

  @Column({ type: 'int', nullable: true })
  variant: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  skin: string;

  @Column({ type: 'int', nullable: true })
  skinValue: number;

  @Column({ type: 'int', nullable: true })
  stamina: number;

  @Column({ type: 'int', nullable: true })
  speed: number;

  @Column({ type: 'int', nullable: true })
  bombSkin: number;

  @Column({ type: 'int', nullable: true })
  skillCount: number;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Column({ type: 'int', nullable: true })
  strength: number;

  @Column({ type: 'int', nullable: true })
  range: number;

  @Column({ type: 'int', nullable: true })
  blockNumber: number;

  @Column({ type: 'int', nullable: true })
  randomizeAbilityCounter: number;

  @Column({ type: 'int', nullable: true })
  numUpgradeShieldLevel: number;

  @Column({ type: 'int', nullable: true })
  numResetShield: number;

  @Column({ type: 'json', nullable: true })
  abilities: string[];

  @Column({ type: 'json', nullable: true })
  abilityHeroS: number[];

  @Column({ type: 'int', nullable: true })
  maxShield: number;

  @Column({ type: 'int', nullable: true })
  currentShield: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  stake: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  stakeSen: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({ type: 'boolean', nullable: true })
  burned: boolean;

  @Column({ type: 'varchar', length: 150, nullable: true })
  genId: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  wallet: string;

  @OneToOne(() => StakeRankingHero, (stakeRankingHero) => stakeRankingHero.hero)
  stakeRankingHero?: StakeRankingHero;

  @OneToMany(() => Stake, (stake) => stake.hero)
  stakes?: Stake[];

  @Column({ type: 'float', nullable: false })
  marketPrice!: number;

  @Column({ type: 'varchar', nullable: false })
  marketToken!: string;

  @Column({ type: 'float', nullable: false })
  openSeaPrice!: number;

  contractAddress?: string;

  @AfterLoad()
  setContractAddress?() {
    if (this.network === WalletNetwork.BSC) {
      this.contractAddress = process.env.CONTRACT_HERO_BSC || '';
    } else if (this.network === WalletNetwork.POLYGON) {
      this.contractAddress = process.env.CONTRACT_HERO_POLYGON || '';
    } else {
      throw new Error(`Unsupported network: ${this.network}`);
    }
  }
}
