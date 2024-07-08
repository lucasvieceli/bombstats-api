import { DataSource, Repository } from 'typeorm';

import { FarmSession } from '@/database/models/FarmSession';
import { Map } from '@/database/models/Map';
import { MapReward } from '@/database/models/MapReward';
import { Injectable } from '@nestjs/common';
import { subHours } from 'date-fns';

@Injectable()
export class MapRewardRepository extends Repository<MapReward> {
  private insertBuffer: Partial<MapReward>[] = [];
  private readonly updateInterval = 1000; // Intervalo de 1 segundo

  constructor(private dataSource: DataSource) {
    super(MapReward, dataSource.createEntityManager());
    this.startInsertProcessor();
  }

  async getAverageRewardByWalletId(walletId: string) {
    if (!walletId) return null;

    const lastFarm = await this.findOne({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });

    if (!lastFarm) return null;

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

  async insertReward(reward: Partial<MapReward>) {
    this.insertBuffer.push(reward);
  }

  private async startInsertProcessor() {
    while (true) {
      if (this.insertBuffer.length > 0) {
        const bufferCopy = this.insertBuffer.slice();
        console.log('bufferCopy insert', bufferCopy.length);
        this.insertBuffer = [];

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const updatePromises = bufferCopy.map((value) => {
            return queryRunner.manager
              .createQueryBuilder()
              .insert()
              .into(MapReward)
              .values(value)
              .execute();
          });

          await Promise.all(updatePromises);
          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
          console.error('Error during bulk insert', err);
        } finally {
          await queryRunner.release();
        }
      }
      await this.delay(this.updateInterval);
    }
  }
  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
