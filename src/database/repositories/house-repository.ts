import { DataSource, In, Repository } from 'typeorm';

import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
import {
  getHousesFromGenIds,
  getHousesWithOwnerFromIds,
} from '@/utils/web3/house';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HouseRepository extends Repository<House> {
  constructor(private dataSource: DataSource) {
    super(House, dataSource.createEntityManager());
  }

  async updateOrInsert(houseData: House, network: WalletNetwork) {
    const house = new House();
    house.network = network;

    Object.assign(house, houseData); // Assign properties from houseData to the new Hero instance

    if (!house.id || !house.network) {
      throw new Error('Both id and network must be set in the house entity');
    }

    await this.upsert(house, ['id', 'network']);

    return house;
  }
  async updateOrInsertArray(houseData: House[], network: WalletNetwork) {
    const houses = houseData
      .map((h) => {
        const house = new House();
        house.network = network;

        Object.assign(house, h); // Assign properties from houseData to the new Hero instance

        if (!house.id || !house.network) {
          return null;
        }
        return house;
      })
      .filter((house) => house !== null);

    await this.upsert(houses, ['id', 'network']);

    return houses;
  }

  async updateHousesFromIds(ids: number[], network: WalletNetwork) {
    const houses = await getHousesWithOwnerFromIds(ids, network);

    return await this.updateOrInsertArray(
      houses.map((house) => {
        return {
          ...(house.house as unknown as House),
          wallet: house.owner,
          updatedAt: new Date(),
        };
      }),
      network,
    );
  }

  async getHousesFromGenId(
    genId: number[],
    network: WalletNetwork,
    wallet: string,
  ) {
    const cleanedGenId = genId.filter((id) => id != 0);

    const housesDb = await this.find({
      where: { genId: In(cleanedGenId), network },
    });

    if (housesDb.length === genId.length) {
      return housesDb;
    }

    const houses = await getHousesFromGenIds(cleanedGenId);

    return await this.updateOrInsertArray(
      houses.map((house) => {
        house.wallet = wallet;
        return house as unknown as House;
      }),
      network,
    );
  }
}
