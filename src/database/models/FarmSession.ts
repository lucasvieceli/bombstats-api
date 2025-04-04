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
import { Wallet } from './Wallet';

@Index('fk_farm_session_walletId', ['walletId'], {})
@Entity('farm_session')
export class FarmSession {
  @PrimaryGeneratedColumn('uuid')
  @Column('char', { primary: true, name: 'id', length: 36 })
  id: string;

  @Column('char', { name: 'walletId', length: 36 })
  walletId: string;

  @Column('datetime', { name: 'startTime', default: () => 'CURRENT_TIMESTAMP' })
  startTime: Date;

  @Column('datetime', { name: 'endTime', nullable: true })
  endTime: Date | null;

  @Column('int', { name: 'totalTime', nullable: true, default: () => "'0'" })
  totalTime: number | null;

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

  @ManyToOne(() => Wallet, (wallet) => wallet.farmSessions, {
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'walletId', referencedColumnName: 'id' }])
  wallet: Wallet;
}
