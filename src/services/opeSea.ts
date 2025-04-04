import { WalletNetwork } from '@/database/models/Wallet';
import { HeroUpdateQueue } from '@/modules/hero/processors/hero-update';
import { HouseUpdateQueue } from '@/modules/house/processors/house-update';
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
  client: OpenSeaStreamClient;
  constructor(
    @InjectQueue('on-hero-retail') private readonly onHeroRetail: Queue,
    @InjectQueue('on-house-retail') private readonly onHouseRetail: Queue,
    @InjectQueue('hero-update') private heroUpdate: HeroUpdateQueue,
    @InjectQueue('house-update') private houseUpdate: HouseUpdateQueue,
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

    setInterval(
      () => {
        this.client.disconnect(() => {
          this.client.connect();
        });
      },
      1000 * 60 * 2,
    );

    this.client.onItemCancelled('bomber-hero-polygon', (event) => {
      Logger.debug(
        'Item Cancelled ' +
          event.payload.item.nft_id.split('/')?.[2]?.toString(),
        'OpenSeaService',
      );
      this.heroUpdate.add('hero-update', {
        heroes: [event.payload.item.nft_id.split('/')?.[2]?.toString()],
        network: WalletNetwork.POLYGON,
        additionalParamsHero: {
          openSeaPrice: null,
        },
      });
    });

    this.client.onItemTransferred('bomber-hero-polygon', (event) => {
      Logger.debug(
        'Item Transferred ' +
          event.payload.item.nft_id.split('/')?.[2]?.toString(),
        'OpenSeaService',
      );
      this.heroUpdate.add('hero-update', {
        heroes: [event.payload.item.nft_id.split('/')?.[2]?.toString()],
        network: WalletNetwork.POLYGON,
        additionalParamsHero: {
          openSeaPrice: null,
          marketPrice: null,
          marketToken: null,
        },
      });
    });

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
    this.client.onItemCancelled('bomber-house', (event) => {
      Logger.debug(
        'Item Cancelled house ' +
          event.payload.item.nft_id.split('/')?.[2]?.toString(),
        'OpenSeaService',
      );
      this.houseUpdate.add('house-update', {
        houses: [event.payload.item.nft_id.split('/')?.[2]?.toString()],
        network: WalletNetwork.POLYGON,
        additionalParamsHouse: {
          openSeaPrice: null,
        },
      });
    });

    this.client.onItemTransferred('bomber-house', (event) => {
      Logger.debug(
        'Item Transferred house ' +
          event.payload.item.nft_id.split('/')?.[2]?.toString(),
        'OpenSeaService',
      );
      this.houseUpdate.add('house-update', {
        houses: [event.payload.item.nft_id.split('/')?.[2]?.toString()],
        network: WalletNetwork.POLYGON,
        additionalParamsHouse: {
          openSeaPrice: null,
          marketPrice: null,
          marketToken: null,
        },
      });
    });
  }

  async onHeroSold(event: ItemSoldEvent) {
    if (event.payload.payment_token.symbol !== 'POL') {
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
    if (event.payload.payment_token.symbol !== 'POL') {
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
    if (event.payload.payment_token.symbol !== 'POL') {
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
    console.log('event', JSON.stringify(event));
    if (event.payload.payment_token.symbol !== 'POL') {
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

  async getTokensIdsInternal(
    collection: string = 'bomber-hero-polygon',
    next?: string,
  ) {
    const tokensIds: ITokenOpenSea[] = [];
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
          timeout: 5000,
        },
      );
      data.listings.forEach(async (listing: any) => {
        const tokenId =
          listing.protocol_data.parameters.offer?.[0].identifierOrCriteria;

        if (!tokenId) return;

        if (listing.price.current.currency !== 'POL') return;

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

      return { tokensIds, next: data?.next };
    } catch (error) {
      Logger.error(
        'Erro ao buscar tokens na OpenSea: ' + error.message,
        'OpenSeaService',
      );
      return { tokensIds, next: next };
    }
  }

  async getTokenIds(collection: string = 'bomber-hero-polygon') {
    let tokensIds: ITokenOpenSea[] = [];
    let next: undefined | string | null = null;

    try {
      while (next === null || next) {
        const data = await this.getTokensIdsInternal(collection, next);
        tokensIds = [...tokensIds, ...data.tokensIds];
        next = data.next;

        Logger.debug(
          'Encontrou ' + tokensIds.length + ' tokens na OpenSea',
          'OpenSeaService',
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      //remove duplicates by tokenId and get the item
      const duplicates = tokensIds.reduce((acc, current) => {
        acc[current.tokenId] = [current];
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
