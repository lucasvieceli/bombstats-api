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
import { Wallet } from './Wallet';

@Index('fk_map_block_mapId', ['mapId'], {})
@Index('fk_map_block_walletId', ['walletId'], {})
@Entity('map_block')
export class MapBlock {
  @PrimaryGeneratedColumn('uuid')
  @Column('char', { primary: true, name: 'id', length: 36 })
  id: string;

  @Column('char', { name: 'mapId', length: 36 })
  mapId: string;

  @Column('int', { name: 'i', nullable: true, default: () => "'0'" })
  i: number | null;

  @Column('int', { name: 'j', nullable: true, default: () => "'0'" })
  j: number | null;

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
  @Column('int', { name: 'type', nullable: true })
  type: number | null;

  @Column('int', { name: 'maxHp', nullable: true, default: () => "'0'" })
  maxHp: number | null;

  @Column('int', { name: 'hp', nullable: true, default: () => "'0'" })
  hp: number | null;

  @Column('char', { name: 'walletId', length: 36 })
  walletId: string;

  @ManyToOne(() => Map, (map) => map.mapBlocks, {
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'mapId', referencedColumnName: 'id' }])
  map: Map;

  @ManyToOne(() => Wallet, (wallet) => wallet.mapBlocks, {
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'walletId', referencedColumnName: 'id' }])
  wallet: Wallet;
}
