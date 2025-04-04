import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
import { HouseRepository } from '@/database/repositories/house-repository';
import { getHousesWithOwnerFromIds } from '@/utils/web3/house';
import { Injectable } from '@nestjs/common';

interface IUpdateHousesByIds {
  network: WalletNetwork;
  ids: string[];
  additionalParamsHouse?: Partial<House>;
}

@Injectable()
export class UpdateHousesById {
  constructor(private houseRepository: HouseRepository) {}

  async execute({ network, ids, additionalParamsHouse }: IUpdateHousesByIds) {
    const houses = await getHousesWithOwnerFromIds(ids, network);

    return await this.houseRepository.updateOrInsertArray(
      houses.map((house) => {
        const existsMarket = house.market;

        return {
          ...(house.house as unknown as House),
          wallet: house.owner,
          updatedAt: new Date(),
          marketPrice: existsMarket ? house.market.price : null,
          marketToken: existsMarket ? house.market.tokenAddress : null,
          ...additionalParamsHouse,
        };
      }),
      network,
    );
  }
}
