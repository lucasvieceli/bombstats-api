import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { HouseRepository } from '@/database/repositories/house-repository';
import { HeroUpdateQueue } from '@/modules/hero/processors/hero-update';
import { HouseUpdateQueue } from '@/modules/house/processors/house-update';
import { OpenSeaService } from '@/services/opeSea';
import { chunkArray } from '@/utils';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QueueEvents } from 'bullmq';
import { IsNull, Not, QueryRunner } from 'typeorm';
export enum NftType {
  HOUSE = 'HOUSE',
  HERO = 'HERO',
}
@Injectable()
export class UpdateOpenSea {
  constructor(
    private openSeaService: OpenSeaService,
    private heroRepository: HeroRepository,
    private houseRepository: HouseRepository,
    @InjectQueue('hero-update') private readonly heroUpdate: HeroUpdateQueue,
    @InjectQueue('house-update') private readonly houseUpdate: HouseUpdateQueue,
  ) {}

  async execute() {
    // await this.getTokens(NftType.HOUSE);
    // await this.getTokens(NftType.HERO);

    await this.updateHeroes();
    await this.updateHouses();
  }

  async updateHeroes() {
    try {
      const heroesSale = await this.heroRepository.find({
        where: { network: WalletNetwork.POLYGON, openSeaPrice: Not(IsNull()) },
      });

      const tokens = await this.getTokens(NftType.HERO);

      const heroesNotSale = heroesSale.filter((hero) => {
        return !tokens.find((token) => token.nftId === hero.id);
      });

      if (heroesNotSale.length) {
        await this.heroRepository
          .createQueryBuilder()
          .update()
          .set({ openSeaPrice: null })
          .where('id IN (:...ids)', {
            ids: heroesNotSale.map((hero) => hero.id),
          })
          .andWhere('network = :network', { network: WalletNetwork.POLYGON })
          .execute();
        // await this.heroRepository.update(
        //   {
        //     id: In(heroesNotSale.map((hero) => hero.id)),
        //     network: WalletNetwork.POLYGON,
        //   },
        //   { openSeaPrice: null },
        // );
      }

      const tokensToUpdate = tokens.filter((token) => {
        return heroesSale.find((hero) => hero.id == token.nftId);
      });

      const tokensToInsert = tokens.filter((token) => {
        return !heroesSale.find((hero) => hero.id == token.nftId);
      });

      Logger.debug(`new heroes ${tokensToInsert.length}`, 'UpdateOpenSea');
      Logger.debug(`update heroes ${tokensToUpdate.length}`, 'UpdateOpenSea');

      await this.updateEntity(tokensToUpdate, 'hero');

      if (tokensToInsert.length) {
        const job = await this.heroUpdate.add(
          'hero-update',
          {
            heroes: tokensToInsert.map((token) => token.nftId),
            network: WalletNetwork.POLYGON,
            log: true,
          },
          { priority: 0 },
        );
        const queueEvents = new QueueEvents('hero-update');
        await job.waitUntilFinished(queueEvents);

        await this.updateEntity(tokensToInsert, 'hero');
      }

      Logger.debug('Heroes updated price', 'UpdateOpenSea');
    } catch (error) {
      Logger.error(`error ${error.message}`, 'UpdateOpenSea');
    }
  }
  async updateHouses() {
    try {
      const housesSale = await this.houseRepository.find({
        where: { network: WalletNetwork.POLYGON, openSeaPrice: Not(IsNull()) },
      });

      const tokens = await this.getTokens(NftType.HOUSE);

      const housesNotSale = housesSale.filter((house) => {
        return !tokens.find((token) => token.nftId === house.id);
      });

      if (housesNotSale.length) {
        const jobNotSale = await this.houseUpdate.add('house-update', {
          houses: housesNotSale.map((house) => house.id),
          network: WalletNetwork.POLYGON,
          log: true,
          additionalParamsHouse: {
            openSeaPrice: null,
          },
        });
        await jobNotSale.waitUntilFinished(new QueueEvents('house-update'));
      }

      const tokensToUpdate = tokens.filter((token) => {
        return housesSale.find((house) => house.id == token.nftId);
      });

      const tokensToInsert = tokens.filter((token) => {
        return !housesSale.find((house) => house.id == token.nftId);
      });

      Logger.debug(`new houses ${tokensToInsert.length}`, 'UpdateOpenSea');
      Logger.debug(`update houses ${tokensToUpdate.length}`, 'UpdateOpenSea');
      await this.updateEntity(tokensToUpdate, 'house');

      if (tokensToInsert.length) {
        const job = await this.houseUpdate.add('house-update', {
          houses: tokensToInsert.map((token) => token.nftId),
          network: WalletNetwork.POLYGON,
          log: true,
        });
        const queueEvents = new QueueEvents('house-update');
        await job.waitUntilFinished(queueEvents);
        await this.updateEntity(tokensToInsert, 'house');
      }

      Logger.debug('Houses updated price', 'UpdateOpenSea');
    } catch (error) {
      Logger.error(`error ${error.message}`, 'UpdateOpenSea');
    }
  }

  async updateEntity(tokens: IToken[], entity: string) {
    const chunks = chunkArray<{
      nftId: string;
      nftType: NftType;
      amount: number;
    }>(tokens, 500);
    for (const batch of chunks) {
      const queryRunner: QueryRunner =
        this.heroRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();

      try {
        // Inicia a transação com nível de isolamento READ UNCOMMITTED
        await queryRunner.startTransaction('READ UNCOMMITTED');

        const queryBuilder = queryRunner.manager
          .createQueryBuilder()
          .update(entity)
          .set({
            openSeaPrice: () =>
              'CASE id ' +
              batch
                .map((token) => `WHEN '${token.nftId}' THEN ${token.amount}`)
                .join(' ') +
              ' END',
            network: WalletNetwork.POLYGON,
            updatedAt: () => 'updatedAt',
          })
          .where('id IN (:...ids)', {
            ids: batch.map((token) => token.nftId),
          })
          .andWhere('network = :network', { network: WalletNetwork.POLYGON });

        await queryBuilder.execute();

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }
  }

  async getTokens(nftType: NftType): Promise<IToken[]> {
    const collection =
      nftType === NftType.HOUSE ? 'bomber-house' : 'bomber-hero-polygon';
    const tokens = await this.openSeaService.getTokenIds(collection);

    // await this.openSeaRepository.delete({ nftType });

    const openSea = tokens
      .map((token) => {
        return {
          nftId: token.tokenId,
          nftType,
          amount: token.price,
        };
      })
      .filter((token) => token.amount > 0);

    return openSea;
  }
}

interface IToken {
  nftId: string;
  nftType: NftType;
  amount: number;
}
