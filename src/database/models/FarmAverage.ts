import { Wallet } from '@/database/models/Wallet';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('farm_average')
export class FarmAverage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('char', { length: 36 })
  walletId: string;

  @Column('float', { nullable: true })
  totalHours: number;

  @Column('float', { nullable: true })
  totalSeconds: number;

  @Column('datetime', { nullable: true })
  startDate: Date;

  @Column('datetime', { nullable: true })
  endDate: Date;

  @Column('float', { nullable: true })
  mapsTotal: number;

  @Column('float', { nullable: true })
  mapsAverage: number;

  @Column('json', { nullable: true })
  tokensList: any;

  @Column('json', { nullable: true })
  tokensAverage: any;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @OneToOne(() => Wallet, (wallet) => wallet.farmAverage, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;
}
