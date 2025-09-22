import { WalletNetwork } from '@/database/models/Wallet';
import { executePromisesBlock, makeRequestWithRetry } from '@/utils';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ITokenOpenSea {
  price: number;
  tokenId: string;
  wallet: string;
}

export interface ICurrentShield {
  id: string;
  shield: number;
}

@Injectable()
export class MarketService {
  constructor() {}

  async getCurrentShieldHero(ids: string[], network: WalletNetwork) {
    const promises = ids.map((id) => async () => {
      try {
        const data = await makeRequestWithRetry(
          `https://api.bombcrypto.io/shield/hero?heroId=${id}&network=${network.toLowerCase()}`,
        );

        if (data?.success && data?.message?.shieldAmount) {
          return {
            id,
            shield: Number(data.message?.shieldAmount?.split('/')?.[0]),
          };
        }

        return null;
      } catch (e) {
        console.error(e);
        return null;
      }
    });

    return (await executePromisesBlock(
      promises,
      20,
      'all',
      0,
      'getCurrentShieldHero',
    )) as Promise<ICurrentShield[] | null[]>;
  }

  async getTokenIds(
    collection: string = 'heroes',
    network: WalletNetwork,
    tokensIds: string[] = [],
  ) {
    // try {
    //   let nextPage = true;
    //   let page = 1;

    //   const url =
    //     network === WalletNetwork.BSC
    //       ? 'https://market-api.bombcrypto.io'
    //       : 'https://market-api-polygon.bombcrypto.io';
    //   while (nextPage) {
    //     const { data } = await axios.get(
    //       `${url}/api/v1/transactions/${collection}/search?status=listing&page=${page}&size=10000&order_by=desc%3Ablock_timestamp`,
    //     );

    //     if (data.transactions.length === 0) {
    //       break;
    //     }

    //     tokensIds = [
    //       ...tokensIds,
    //       ...data.transactions
    //         .filter((hero) => Boolean(hero.token_id))
    //         .map((hero) => hero.token_id),
    //     ];
    //     nextPage = data.has_more;
    //     page++;
    //   }
    // } catch (error) {
    //   Logger.error(
    //     'Erro ao buscar tokens na OpenSea: ' + error.message,
    //     'OpenSeaService',
    //   );
    //   return tokensIds;
    // }

    return tokensIds;
  }
}
