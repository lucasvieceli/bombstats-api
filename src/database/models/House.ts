import { WalletNetwork } from '@/database/models/Wallet';
import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('house')
export class House {
  @PrimaryColumn()
  id!: number;

  @PrimaryColumn({
    type: 'enum',
    enum: WalletNetwork,
  })
  network!: WalletNetwork;

  @Column({ type: 'int', nullable: true })
  index: number;

  @Column({ type: 'int', nullable: true })
  rarity: number;

  @Column({ type: 'int', nullable: true })
  recovery: number;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Column({ type: 'int', nullable: true })
  blockNumber: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  genId: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  wallet: string;

  @Column({ type: 'float', nullable: false })
  marketPrice!: number;

  @Column({ type: 'varchar', nullable: false })
  marketToken!: string;

  @Column({ type: 'float', nullable: false })
  openSeaPrice!: number;
}
