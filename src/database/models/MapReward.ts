import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Map } from './Map';
import { Wallet } from '@/database/models/Wallet';

@Index('fk_map_reward_mapId', ['mapId'], {})
@Entity('map_reward')
export class MapReward {
  @PrimaryGeneratedColumn('uuid')
  @Column('char', { primary: true, name: 'id', length: 36 })
  id: string;

  @Column('char', { name: 'type', length: 50 })
  type: string;

  @Column('decimal', {
    name: 'value',
    precision: 20,
    scale: 18,
    default: () => "'0.000000000000000000'",
  })
  value: string;

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

  @Column('char', { name: 'mapId', length: 36 })
  mapId: string;

  @ManyToOne(() => Map, (map) => map.mapRewards, {
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'mapId', referencedColumnName: 'id' }])
  map: Map;

  @Column('char', { name: 'walletId', length: 36 })
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.mapRewards, {
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'walletId', referencedColumnName: 'id' }])
  wallet: Wallet;
}
