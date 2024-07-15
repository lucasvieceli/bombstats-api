import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
import { HouseRepository } from '@/database/repositories/house-repository';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { FindOptionsRelationByString, FindOptionsRelations, In } from 'typeorm';

interface IGetHousesByIds {
  network: WalletNetwork;
  ids: number[] | string[];
  relations?: FindOptionsRelations<House> | FindOptionsRelationByString;
}

@Injectable()
export class GetHousesByIds {
  constructor(
    private houseRepository: HouseRepository,
    @InjectQueue('house-update') private readonly houseUpdate: Queue,
  ) {}

  async execute({ network, ids, relations }: IGetHousesByIds) {
    try {
      const idsNumber = ids.map((id) => {
        const value = Number(id);

        if (isNaN(value)) {
          throw new BadRequestException('Invalid id');
        }

        return value;
      });

      let housesDb = await this.houseRepository.find({
        where: { id: In(idsNumber), network },
        relations,
      });

      const notIncluded = idsNumber.filter(
        (id) => !housesDb.map((hero) => hero.id).includes(id),
      );

      if (notIncluded.length > 0) {
        const newHouses = await this.houseRepository.updateHousesFromIds(
          notIncluded,
          network,
        );

        housesDb = housesDb.concat(newHouses);
      }
      this.checkUpdateHouses(housesDb, network);

      return housesDb;
    } catch (e) {
      console.log('e', e);
      if (e.message.includes("Out of range value for column 'id' ")) {
        throw new BadRequestException('Invalid id');
      }

      throw e;
    }
  }

  async checkUpdateHouses(houses: House[], network: WalletNetwork) {
    const housesToUpdate = houses.filter(
      (house) => house.updatedAt < new Date(Date.now() - 1000 * 60 * 60 * 6),
    );

    if (housesToUpdate.length > 0) {
      await this.houseUpdate.add('hero-update', {
        houses: housesToUpdate.map((house) => house.id),
        network,
      });
    }
  }
}

@Processor('house-update', { concurrency: 2 })
export class HouseUpdateProcessor extends WorkerHost {
  constructor(private houseRepository: HouseRepository) {
    super();
  }

  async process(
    data: Job<{ houses: number[]; network: WalletNetwork }>,
  ): Promise<any> {
    Logger.log('house update');
    try {
      await this.houseRepository.updateHousesFromIds(
        data.data.houses,
        data.data.network,
      );
    } catch (e) {
      Logger.error(e);
    }
  }
}
