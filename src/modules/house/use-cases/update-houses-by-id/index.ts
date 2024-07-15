import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
import { HouseRepository } from '@/database/repositories/house-repository';
import { OpenSeaService } from '@/services/opeSea';
import { getHousesWithOwnerFromIds } from '@/utils/web3/house';
import { Injectable } from '@nestjs/common';

interface IUpdateHousesByIds {
  network: WalletNetwork;
  ids: number[];
}

@Injectable()
export class UpdateHousesById {
  constructor(
    private houseRepository: HouseRepository,
    private openSeaService: OpenSeaService,
  ) {}

  async execute({ network, ids }: IUpdateHousesByIds) {
    console.log('ids', ids);
    const [houses, opensea] = await Promise.all([
      getHousesWithOwnerFromIds(ids, network),
      network === WalletNetwork.POLYGON
        ? this.openSeaService.getCurrentPriceHouse(ids)
        : [],
    ]);
    return await this.houseRepository.updateOrInsertArray(
      houses.map((house) => {
        const existsMarket = house.market;
        const existsOpenSea = opensea.find((o) => o.tokenId == house.house.id);

        return {
          ...(house.house as unknown as House),
          wallet: house.owner,
          updatedAt: new Date(),
          marketPrice: existsMarket ? house.market.price : null,
          marketToken: existsMarket ? house.market.tokenAddress : null,
          openSeaPrice: existsOpenSea ? existsOpenSea.price : null,
        };
      }),
      network,
    );
  }
}
