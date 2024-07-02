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
    const [blocks, overallStats] = await Promise.all([
      this.createQueryBuilder()
        .select('type')
        .addSelect('COUNT(*) as qty')
        .where('walletId = :walletId', { walletId })
        .where('hp > 0')
        .groupBy('type')
        .getRawMany(),
      this.createQueryBuilder()
        .select('SUM(hp) as totalHp')
        .addSelect('SUM(maxHp) as totalMaxHp')
        .addSelect(
          'SUM(CASE WHEN hp > 0 THEN 1 ELSE 0 END) as totalBlocksWithLife',
        )
        .addSelect('COUNT(*) as totalBlocks')
        .where('walletId = :walletId', { walletId })
        .getRawOne(),
    ]);

    return { blocks, overallStats };
  }
}
