import { WalletNetwork } from '@/database/models/Wallet';
import { chunkArray } from '@/utils';
import { NAMES_TOKENS_IDS_MAP } from '@/utils/web3/reward';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  ItemListedEvent,
  ItemSoldEvent,
  Network,
  OpenSeaStreamClient,
} from '@opensea/stream-js';
import axios from 'axios';
import { Queue } from 'bullmq';
import { WebSocket } from 'ws';

const API_KEY = process.env.OPEN_SEA_KEY!;

export interface ITokenOpenSea {
  price: number;
  tokenId: string;
  wallet: string;
}

@Injectable()
export class OpenSeaService {
  client;
  constructor(
    @InjectQueue('on-hero-retail') private readonly onHeroRetail: Queue,
    @InjectQueue('on-house-retail') private readonly onHouseRetail: Queue,
  ) {
    this.client = new OpenSeaStreamClient({
      token: API_KEY!,
      connectOptions: {
        transport: WebSocket,
      },
      network: Network.MAINNET,
      onError: () => {},
    });
    this.client.connect();
    this.client.onItemListed('bomber-hero-polygon', (event) =>
      this.onHeroListed(event),
    );
    this.client.onItemSold('bomber-hero-polygon', (event) =>
      this.onHeroSold(event),
    );
    this.client.onItemListed('bomber-house', (event) =>
      this.onHouseListed(event),
    );
    this.client.onItemSold('bomber-house', (event) => this.onHouseSold(event));
  }

  async onHeroSold(event: ItemSoldEvent) {
    console.log('event sold', JSON.stringify(event));
    if (event.payload.payment_token.symbol !== 'MATIC') {
      return;
    }

    const id = event.payload.item.nft_id.split('/')?.[2]?.toString();
    const amount = Number(event.payload.sale_price) / 10 ** 18;

    if (id) {
      await this.onHeroRetail.add('on-hero-retail', {
        id,
        amount,
        type: 'sold',
        network: WalletNetwork.POLYGON,
        marketPlace: 'opensea',
        tokenAddress: NAMES_TOKENS_IDS_MAP.MATIC,
      });
    }
  }
  async onHeroListed(event: ItemListedEvent) {
    console.log('event listed', JSON.stringify(event));
    if (event.payload.payment_token.symbol !== 'MATIC') {
      return;
    }

    const id = event.payload.item.nft_id.split('/')?.[2]?.toString();
    const amount = Number(event.payload.base_price) / 10 ** 18;

    if (id) {
      await this.onHeroRetail.add('on-hero-retail', {
        id,
        amount,
        type: 'listed',
        network: WalletNetwork.POLYGON,
        marketPlace: 'opensea',
        tokenAddress: NAMES_TOKENS_IDS_MAP.MATIC,
      });
    }
  }

  async onHouseSold(event: ItemSoldEvent) {
    if (event.payload.payment_token.symbol !== 'MATIC') {
      return;
    }

    const id = event.payload.item.nft_id.split('/')?.[2]?.toString();
    const amount = Number(event.payload.sale_price) / 10 ** 18;

    if (id) {
      await this.onHouseRetail.add('on-house-retail', {
        id,
        amount,
        type: 'sold',
        network: WalletNetwork.POLYGON,
        marketPlace: 'opensea',
        tokenAddress: NAMES_TOKENS_IDS_MAP.MATIC,
      });
    }
  }

  async onHouseListed(event: ItemListedEvent) {
    if (event.payload.payment_token.symbol !== 'MATIC') {
      return;
    }

    const id = event.payload.item.nft_id.split('/')?.[2]?.toString();
    const amount = Number(event.payload.base_price) / 10 ** 18;

    if (id) {
      await this.onHouseRetail.add('on-house-retail', {
        id,
        amount,
        type: 'listed',
        network: WalletNetwork.POLYGON,
        marketPlace: 'opensea',
        tokenAddress: NAMES_TOKENS_IDS_MAP.MATIC,
      });
    }
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

  async getTokenIds(
    collection: string = 'bomber-hero-polygon',
    tokensIds: ITokenOpenSea[] = [],
    next?: string,
  ) {
    try {
      const { data } = await axios.get(
        `https://api.opensea.io/api/v2/listings/collection/${collection}/all`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
          params: {
            next,
          },
        },
      );
      data.listings.forEach(async (listing: any) => {
        const tokenId =
          listing.protocol_data.parameters.offer?.[0].identifierOrCriteria;

        if (!tokenId) return;

        if (listing.price.current.currency !== 'MATIC') return;

        const price =
          listing.price.current.value / 10 ** listing.price.current.decimals;
        const startTime = listing.protocol_data.parameters.startTime;
        const endTime = listing.protocol_data.parameters.endTime;
        const currentTime = Math.floor(Date.now() / 1000); // Timestamp Unix em segundos

        // Validar startTime e endTime, se existirem
        if (
          (!startTime || startTime <= currentTime) &&
          (!endTime || endTime >= currentTime)
        ) {
          tokensIds.push({
            price,
            tokenId,
            wallet: listing.protocol_data.parameters.offerer,
          });
        }
      });
      Logger.debug(
        'Encontrou ' + tokensIds.length + ' tokens na OpenSea',
        'OpenSeaService',
      );
      if (data.next) {
        // await sleep(1000);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return await this.getTokenIds(collection, tokensIds, data.next);
      }

      //remove duplicates by tokenId and get the item
      const duplicates = tokensIds.reduce((acc, current) => {
        if (acc[current.tokenId]) {
          acc[current.tokenId].push(current);
        } else {
          acc[current.tokenId] = [current];
        }
        return acc;
      }, {});

      return Object.values(duplicates).map((item) => item[0]);
    } catch (error) {
      Logger.error(
        'Erro ao buscar tokens na OpenSea: ' + error.message,
        'OpenSeaService',
      );
      return tokensIds;
    }
  }
}
