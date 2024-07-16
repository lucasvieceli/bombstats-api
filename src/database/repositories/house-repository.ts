import { DataSource, Repository } from 'typeorm';

import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
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
    const housesToUpsert = houses.map((hero) => ({ ...hero }));

    await this.upsert(housesToUpsert, ['id', 'network']);

    return houses;
  }
}
