import { DataSource, Repository } from 'typeorm';

import { MapBlock } from '@/database/models/MapBlock';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MapBlockRepository extends Repository<MapBlock> {
  private updateBuffer: {
    walletId: string;
    i: number;
    j: number;
    hp: number;
  }[] = [];
  private readonly updateInterval = 1000; // Intervalo de 1 segundo

  constructor(private dataSource: DataSource) {
    super(MapBlock, dataSource.createEntityManager());
    this.startUpdateProcessor();
  }

  async deleteFromWalletId(walletId: string) {
    return await this.delete({ walletId });
  }

  async deleteBlock(walletId: string, i: number, j: number) {
    return await this.delete({ walletId, i, j });
  }

  async updateBlock(walletId: string, i: number, j: number, hp: number) {
    this.updateBuffer.push({ walletId, i, j, hp });
  }

  async getCurrentMap(walletId: string) {
    const blocks = await this.createQueryBuilder()
      .select(['type', 'hp', 'i', 'j', 'maxHp'])
      .where('walletId = :walletId', { walletId })
      .getRawMany();

    return { blocks };
  }

  private async startUpdateProcessor() {
    while (true) {
      if (this.updateBuffer.length > 0) {
        const bufferCopy = this.updateBuffer.slice();
        this.updateBuffer = [];

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction('READ UNCOMMITTED');

        try {
          const updatePromises = bufferCopy.map(({ walletId, i, j, hp }) => {
            return queryRunner.manager
              .createQueryBuilder()
              .update(MapBlock)
              .set({ hp, updatedAt: () => 'CURRENT_TIMESTAMP' })
              .where('walletId = :walletId AND i = :i AND j = :j', {
                walletId,
                i,
                j,
              })
              .execute();
          });

          await Promise.all(updatePromises);
          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
          console.error('Error during bulk update', err);
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
