import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from './Wallet';
import { MapBlock } from './MapBlock';
import { MapReward } from './MapReward';

@Index('fk_map_walletId', ['walletId'], {})
@Entity('map')
export class Map {
  @PrimaryGeneratedColumn('uuid')
  @Column('char', { primary: true, name: 'id', length: 36 })
  id: string;

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

  @Column('char', { name: 'walletId', length: 36 })
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.maps, {
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'walletId', referencedColumnName: 'id' }])
  wallet: Wallet;

  @OneToMany(() => MapBlock, (mapBlock) => mapBlock.map)
  mapBlocks: MapBlock[];

  @OneToMany(() => MapReward, (mapReward) => mapReward.map)
  mapRewards: MapReward[];
}
