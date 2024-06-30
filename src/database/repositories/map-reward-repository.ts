import { DataSource, Repository } from 'typeorm';

import { FarmSession } from '@/database/models/FarmSession';
import { Map } from '@/database/models/Map';
import { MapReward } from '@/database/models/MapReward';
import { Injectable } from '@nestjs/common';
import { startOfDay } from 'date-fns';

@Injectable()
export class MapRewardRepository extends Repository<MapReward> {
  constructor(private dataSource: DataSource) {
    super(MapReward, dataSource.createEntityManager());
  }

  async getAverageRewardByWalletId(walletId: string) {
    const lastFarm = await this.findOne({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });

    if (!lastFarm) return null;

    const startDate = startOfDay(lastFarm.createdAt);
    const endDate = new Date();

    const [totalSecondsResult, tokens, maps] = await Promise.all([
      this.dataSource
        .getRepository(FarmSession)
        .createQueryBuilder('farmSession')
        .select('SUM(farmSession.totalTime)', 'totalSeconds')
        .where('farmSession.walletId = :walletId', { walletId })
        .andWhere('farmSession.startTime >= :startDate', { startDate })
        .andWhere('farmSession.endTime <= :endDate', { endDate })
        .andWhere('farmSession.totalTime > 0')
        .getRawOne(),
      this.createQueryBuilder()
        .select('SUM(value)', 'total')
        .addSelect('type')
        .where('walletId = :walletId', { walletId })
        .andWhere('createdAt >= :startDate', { startDate })
        .andWhere('createdAt <= :endDate', { endDate })
        .groupBy('type')
        .getRawMany(),
      this.dataSource
        .getRepository(Map)
        .createQueryBuilder('map')
        .select('count(id)', 'total')
        .where('walletId = :walletId', { walletId })
        .andWhere('createdAt >= :startDate', { startDate })
        .andWhere('createdAt <= :endDate', { endDate })
        .getRawOne(),
    ]);

    const totalSeconds = totalSecondsResult.totalSeconds || 0;
    const totalHours = totalSeconds / 3600 < 1 ? 1 : totalSeconds / 3600;

    return {
      totalHours,
      totalSeconds,
      startDate,
      endDate,
      maps: {
        total: Number(maps.total),
        average: maps.total / totalHours,
      },
      tokens: {
        list: tokens,
        average: tokens.map((token) => ({
          type: token.type,
          value: Number(token.total) / totalHours,
        })),
      },
    };
  }
}
