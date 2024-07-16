import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NftType {
  HOUSE = 'HOUSE',
  HERO = 'HERO',
}

@Entity('open_sea')
export class OpenSea {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'float', nullable: false })
  amount!: number;

  @Column({
    type: 'enum',
    enum: NftType,
    nullable: true,
    enumName: 'nftType',
  })
  nftType!: NftType;

  @Column({ type: 'varchar', nullable: false })
  nftId!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
