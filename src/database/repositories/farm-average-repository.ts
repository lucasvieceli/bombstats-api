import { DataSource, Repository } from 'typeorm';

import { FarmSession } from '@/database/models/FarmSession';
import { Map } from '@/database/models/Map';
import { MapReward } from '@/database/models/MapReward';
import { Injectable } from '@nestjs/common';
import { subHours } from 'date-fns';
import { FarmAverage } from '@/database/models/FarmAverage';

@Injectable()
export class FarmAverageRepository extends Repository<FarmAverage> {
  constructor(private dataSource: DataSource) {
    super(FarmAverage, dataSource.createEntityManager());
  }

  async createAverageRewardByWalletId(walletId: string) {
    if (!walletId) return null;

    const lastFarm = await this.dataSource.getRepository(MapReward).findOne({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });

    if (!lastFarm) {
      await this.upsert(
        {
          walletId,
          totalHours: 0,
          totalSeconds: 0,
          startDate: null,
          endDate: null,
          mapsTotal: null,
          mapsAverage: null,
          tokensList: null,
          tokensAverage: null,
          updatedAt: new Date(),
        },
        ['walletId'],
      );
      return null;
    }

    const startDate = subHours(new Date(lastFarm.createdAt), 24);
    const endDate = new Date(lastFarm.createdAt);

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
      this.dataSource
        .getRepository(MapReward)
        .createQueryBuilder()
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

    const mapsTotal = Number(maps.total);
    const mapsAverage = mapsTotal / totalHours;
    const tokensList = tokens;
    const tokensAverage = tokensList.map((token) => ({
      type: token.type,
      value: Number(token.total) / totalHours,
    }));

    await this.upsert(
      {
        walletId,
        totalHours,
        totalSeconds,
        startDate,
        endDate,
        mapsTotal,
        mapsAverage,
        tokensList,
        tokensAverage,
        updatedAt: new Date(),
      },
      ['walletId'],
    );

    return {
      walletId,
      totalHours,
      totalSeconds,
      startDate,
      endDate,
      mapsTotal,
      mapsAverage,
      tokensList,
      tokensAverage,
    } as FarmAverage;
  }
}
