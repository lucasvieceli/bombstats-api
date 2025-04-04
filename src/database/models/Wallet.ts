import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FarmSession } from './FarmSession';
import { Map } from './Map';
import { MapBlock } from './MapBlock';
import { MapReward } from '@/database/models/MapReward';
import { StakeRankingWallet } from '@/database/models/StakeRankingWallet';
import { ClaimRankingWallet } from '@/database/models/ClaimRankingWallet';
import { FarmAverage } from '@/database/models/FarmAverage';
import { StakeSenRankingWallet } from '@/database/models/StakeSenRankingWallet';
import { Stake } from '@/database/models/Stake';
import { StakeRankingWalletGlobal } from '@/database/models/StakeRankingWalletGlobal';

export enum WalletStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}
export enum WalletNetwork {
  BSC = 'BSC',
  POLYGON = 'POLYGON',
}

@Entity('wallet')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  @Column('char', { primary: true, name: 'id', length: 36 })
  id: string;

  @Column('char', { name: 'walletId', length: 60 })
  walletId: string;

  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updatedAt',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column('enum', {
    name: 'network',
    nullable: true,
    enum: WalletNetwork,
  })
  network: WalletNetwork | null;

  @Column('enum', {
    name: 'online',
    nullable: true,
    enum: WalletStatus,
  })
  online: WalletStatus | null;

  @Column('boolean', {
    name: 'extensionInstalled',
    nullable: true,
  })
  extensionInstalled: boolean;

  @OneToMany(() => FarmSession, (farmSession) => farmSession.wallet)
  farmSessions: FarmSession[];

  @OneToMany(() => Map, (map) => map.wallet)
  maps: Map[];

  @OneToMany(() => MapBlock, (mapBlock) => mapBlock.wallet)
  mapBlocks: MapBlock[];

  @OneToMany(() => MapReward, (mapReward) => mapReward.wallet)
  mapRewards: MapReward[];

  @OneToOne(
    () => StakeRankingWallet,
    (stakeRankingWallet) => stakeRankingWallet.walletEntity,
  )
  stakeRankingWallet: StakeRankingWallet;

  @OneToMany(() => Stake, (stake) => stake.walletEntity)
  stakes: Stake[];

  @OneToOne(
    () => StakeSenRankingWallet,
    (stakeSenRankingWallet) => stakeSenRankingWallet.walletEntity,
  )
  stakeSenRankingWallet: StakeSenRankingWallet;

  @OneToOne(
    () => StakeRankingWalletGlobal,
    (stakeRankingWalletGlobal) => stakeRankingWalletGlobal.walletEntity,
  )
  stakeRankingWalletGlobal: StakeRankingWalletGlobal;

  @OneToOne(
    () => ClaimRankingWallet,
    (claimRankingWallet) => claimRankingWallet.walletEntity,
  )
  claimRankingWallet: ClaimRankingWallet;

  @OneToOne(() => FarmAverage, (farmAverage) => farmAverage.wallet)
  farmAverage: FarmAverage;
}
