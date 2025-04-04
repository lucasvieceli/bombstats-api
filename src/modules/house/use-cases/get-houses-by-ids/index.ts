import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
import { HouseRepository } from '@/database/repositories/house-repository';
import { HouseUpdateQueue } from '@/modules/house/processors/house-update';
import { UpdateHousesById } from '@/modules/house/use-cases/update-houses-by-id';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { FindOptionsRelationByString, FindOptionsRelations, In } from 'typeorm';

interface IGetHousesByIds {
  network: WalletNetwork;
  ids: string[];
  relations?: FindOptionsRelations<House> | FindOptionsRelationByString;
}

@Injectable()
export class GetHousesByIds {
  constructor(
    private houseRepository: HouseRepository,
    private updateHousesById: UpdateHousesById,
    @InjectQueue('house-update') private readonly houseUpdate: HouseUpdateQueue,
  ) {}

  async execute({ network, ids, relations }: IGetHousesByIds) {
    try {
      ids.map((id) => {
        const value = Number(id);

        if (isNaN(value)) {
          throw new BadRequestException('Invalid id');
        }

        return value;
      });

      let housesDb = await this.houseRepository.find({
        where: { id: In(ids), network },
        relations,
      });

      const notIncluded = ids.filter(
        (id) => !housesDb.map((hero) => hero.id).includes(id),
      );

      if (notIncluded.length > 0) {
        const newHouses = await this.updateHousesById.execute({
          ids: notIncluded,
          network,
        });
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
