import { chunkArray } from '@/utils';
import { Injectable } from '@nestjs/common';
import { Network, OpenSeaStreamClient } from '@opensea/stream-js';
import axios from 'axios';
import { WebSocket } from 'ws';

const API_KEY = 'e05f9f908e7b4722a7bc6e36c3ffc8b0';

@Injectable()
export class OpenSeaService {
  client;
  constructor() {
    this.client = new OpenSeaStreamClient({
      token: API_KEY!,
      connectOptions: {
        transport: WebSocket,
      },
      network: Network.MAINNET,
    });
    this.client.connect();
    this.client.onItemListed('bomber-hero-polygon', () => {
      console.log('hero listed polygon');
    });
    this.client.onItemSold('bomber-hero-polygon', () =>
      console.log('hero sold polygon'),
    );
    this.client.onItemListed('bomber-house', () =>
      console.log('house listed polygon'),
    );
    this.client.onItemSold('bomber-house', () =>
      console.log('house sold polygon'),
    );
  }

  async getCurrentPriceHero(tokenIds: number[] | string[]) {
    return this.getCurrentPriceNft(
      process.env.CONTRACT_HERO_POLYGON!,
      tokenIds,
    );
  }
  async getCurrentPriceHouse(tokenIds: number[] | string[]) {
    return this.getCurrentPriceNft(
      process.env.CONTRACT_HOUSE_POLYGON!,
      tokenIds,
    );
  }

  async getCurrentPriceNft(nftAddress: string, tokenIds: number[] | string[]) {
    const nfts = [];
    const chunks = chunkArray(tokenIds, 30);

    try {
      for (const chunk of chunks) {
        const { data } = await axios.get(
          `https://api.opensea.io/v2/orders/matic/seaport/listings`,
          {
            headers: {
              'X-API-KEY': API_KEY,
            },
            params: {
              asset_contract_address: nftAddress,
              token_ids: chunk,
            },
            paramsSerializer: (params) => {
              const result = [];
              for (const key in params) {
                if (Array.isArray(params[key])) {
                  params[key].forEach((val) => {
                    result.push(`${key}=${val}`);
                  });
                } else {
                  result.push(`${key}=${params[key]}`);
                }
              }
              return result.join('&');
            },
          },
        );

        if (data.orders.length === 0) continue;

        data.orders.forEach((order) => {
          const tokenId =
            order?.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;

          if (!tokenId) return;

          nfts.push({
            tokenId,
            price: order.current_price / 10 ** 18,
          });
        });
      }
    } catch (e) {
      console.log(e, nfts.length);
    }

    return nfts;
  }
}
