import { House } from '@/database/models/House';
import { NftType, OpenSea } from '@/database/models/OpenSea';
import { WalletNetwork } from '@/database/models/Wallet';
import { HouseRepository } from '@/database/repositories/house-repository';
import { OpenSeaRepository } from '@/database/repositories/open-sea-repository';
import { getHousesWithOwnerFromIds } from '@/utils/web3/house';
import { Injectable } from '@nestjs/common';

interface IUpdateHousesByIds {
  network: WalletNetwork;
  ids: string[];
}

@Injectable()
export class UpdateHousesById {
  constructor(
    private houseRepository: HouseRepository,
    private openSeaRepository: OpenSeaRepository,
  ) {}

  async execute({ network, ids }: IUpdateHousesByIds) {
    const [houses, opensea] = await Promise.all([
      getHousesWithOwnerFromIds(ids, network),
      network === WalletNetwork.POLYGON
        ? this.openSeaRepository.getByIds(ids, NftType.HERO)
        : ([] as OpenSea[]),
    ]);
    return await this.houseRepository.updateOrInsertArray(
      houses.map((house) => {
        const existsMarket = house.market;
        const existsOpenSea = opensea.find((o) => o.nftId == house.house.id);

        return {
          ...(house.house as unknown as House),
          wallet: house.owner,
          updatedAt: new Date(),
          marketPrice: existsMarket ? house.market.price : null,
          marketToken: existsMarket ? house.market.tokenAddress : null,
          openSeaPrice: existsOpenSea ? existsOpenSea.amount : null,
        };
      }),
      network,
    );
  }
}
