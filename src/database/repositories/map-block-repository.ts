import { DataSource, Repository } from 'typeorm';

import { MapBlock } from '@/database/models/MapBlock';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MapBlockRepository extends Repository<MapBlock> {
  constructor(private dataSource: DataSource) {
    super(MapBlock, dataSource.createEntityManager());
  }

  async deleteFromWalletId(walletId: string) {
    return await this.delete({ walletId });
  }

  async deleteBlock(walletId: string, i: number, j: number) {
    return await this.delete({ walletId, i, j });
  }

  async updateBlock(walletId: string, i: number, j: number, hp: number) {
    return await this.update({ walletId, i, j }, { hp });
  }

  async getCurrentMap(walletId: string) {
    const blocks = await this.createQueryBuilder()
      .select(['type', 'hp', 'i', 'j', 'maxHp'])
      .where('walletId = :walletId', { walletId })
      .getRawMany();

    return { blocks };
  }
}
