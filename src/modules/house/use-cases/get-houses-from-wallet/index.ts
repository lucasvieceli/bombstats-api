import { Hero } from '@/database/models/Hero';
import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
import { HouseRepository } from '@/database/repositories/house-repository';
import { decodeHouseId, getHousesFromGenIds } from '@/utils/web3/house';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { FindOptionsRelationByString, FindOptionsRelations } from 'typeorm';

interface IGetHousesFromGenIds {
  network: WalletNetwork;
  genIds: string[];
  wallet: string;
  relations?: FindOptionsRelations<Hero> | FindOptionsRelationByString;
}

@Injectable()
export class GetHousesFromWallet {
  constructor(
    private houseRepository: HouseRepository,
    @InjectQueue('house-update') private readonly houseUpdate: Queue,
  ) {}

  async execute({ network, genIds, relations, wallet }: IGetHousesFromGenIds) {
    const cleanedGenId = genIds.filter((id) => id != '0');

    const housesDb = await this.houseRepository.find({
      where: { wallet: wallet.toLowerCase(), network },
      relations,
    });

    this.checkUpdate(housesDb, network);

    const differentGenIds = housesDb.filter(
      (house) =>
        !cleanedGenId.map((genId) => decodeHouseId(genId)).includes(house.id),
    );

    const isEqual =
      differentGenIds.length === 0 && housesDb.length === cleanedGenId.length;

    if (isEqual) {
      return housesDb;
    }

    const housesIdsDb = housesDb.map((house) => house.id);
    const houses = (await getHousesFromGenIds(cleanedGenId)).filter(
      (h) => !housesIdsDb.includes(h.id),
    );

    return await this.houseRepository.updateOrInsertArray(
      houses.map((house) => {
        house.wallet = wallet;
        return house as unknown as House;
      }),
      network,
    );
  }

  async checkUpdate(houses: House[], network: WalletNetwork) {
    const heroesToUpdate = houses.filter(
      (house) => house.updatedAt < new Date(Date.now() - 1000 * 60 * 60 * 6),
    );

    if (heroesToUpdate.length > 0) {
      await this.houseUpdate.add('house-update', {
        houses: heroesToUpdate.map((house) => house.id),
        network,
      });
    }
  }
}
