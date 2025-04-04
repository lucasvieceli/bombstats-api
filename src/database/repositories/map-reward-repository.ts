import { DataSource, Repository } from 'typeorm';

import { MapReward } from '@/database/models/MapReward';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MapRewardRepository extends Repository<MapReward> {
  private insertBuffer: Partial<MapReward>[] = [];
  private readonly updateInterval = 1000; // Intervalo de 1 segundo

  constructor(private dataSource: DataSource) {
    super(MapReward, dataSource.createEntityManager());
    // this.startInsertProcessor();
  }

  // async insertReward(reward: Partial<MapReward>) {
  //   this.insertBuffer.push(reward);
  // }

  // private async startInsertProcessor() {
  //   while (true) {
  //     if (this.insertBuffer.length > 0) {
  //       const bufferCopy = this.insertBuffer.slice();
  //       this.insertBuffer = [];

  //       const queryRunner = this.dataSource.createQueryRunner();
  //       await queryRunner.connect();
  //       await queryRunner.startTransaction('READ UNCOMMITTED');

  //       try {
  //         const updatePromises = bufferCopy.map((value) => {
  //           return queryRunner.manager
  //             .createQueryBuilder()
  //             .insert()
  //             .into(MapReward)
  //             .values(value)
  //             .execute();
  //         });

  //         await Promise.all(updatePromises);
  //         await queryRunner.commitTransaction();
  //       } catch (err) {
  //         await queryRunner.rollbackTransaction();
  //         console.error('Error during bulk insert', err);
  //       } finally {
  //         await queryRunner.release();
  //       }
  //     }
  //     await this.delay(this.updateInterval);
  //   }
  // }
  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
