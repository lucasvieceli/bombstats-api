import { WalletNetwork } from '@/database/models/Wallet';
import {
  HeroRepository,
  IGetBestCostMarket,
  IGetBestCostOpenSea,
} from '@/database/repositories/hero-repository';
import { TotalsRepository } from '@/database/repositories/totals-repository';
import { HERO_QUARTZ } from '@/utils/web3/hero';
import { NAMES_TOKENS_IDS_MAP } from '@/utils/web3/reward';
import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';

interface IGetBestCostQuartz {
  network: WalletNetwork;
}

@Injectable()
export class GetBestCostQuartz {
  constructor(
    private totalsRepository: TotalsRepository,
    private heroRepository: HeroRepository,
  ) {}

  async execute({ network }: IGetBestCostQuartz) {
    const tokenBcoin =
      network === WalletNetwork.POLYGON
        ? NAMES_TOKENS_IDS_MAP.BCOIN_POLYGON
        : NAMES_TOKENS_IDS_MAP.BCOIN_BSC;

    const [totals, heroesOpenSea, heroesMarketBcoin] = await Promise.all([
      this.totalsRepository.find({
        where: {
          network,
          name: In(['sens', 'matic', 'bcoin', 'bnb']),
        },
      }),
      this.heroRepository.getBestCostQuartzOpenSea(network),
      this.heroRepository.getBestCostQuartzMarket(network, tokenBcoin),
    ]);

    const sens = Number(totals?.find((r) => r.name === 'sens').value);
    const bcoin = Number(totals?.find((r) => r.name === 'bcoin').value);
    const matic = Number(totals?.find((r) => r.name === 'matic')?.value);
    const bnb = Number(totals?.find((r) => r.name === 'bnb')?.value);

    const mainToken = network === WalletNetwork.POLYGON ? matic : bnb;

    const bcoinInMainToken = bcoin / mainToken;
    const senInMainToken = sens / mainToken;

    const items = Array.from({ length: 6 }).map((_, index) =>
      this.mountRarityIndex(
        index,
        bcoinInMainToken,
        senInMainToken,
        heroesOpenSea,
        heroesMarketBcoin,
      ),
    );

    const bestRarity = this.getBestRarity(items);

    return {
      bestRarity,
      items,
      senInMainToken,
      bcoinInMainToken,
      mainToken,
    };
  }

  mountRarityIndex(
    index: number,
    bcoinInMainToken: number,
    senInMainToken: number,
    heroesOpenSea: IGetBestCostOpenSea[],
    heroesMarketBcoin: IGetBestCostMarket[],
  ) {
    const openSea = heroesOpenSea.find((h) => h.rarityIndex === index);
    const marketBcoin = heroesMarketBcoin.find((h) => h.rarityIndex === index);
    const quartz = HERO_QUARTZ[index].generate;
    const quartzMultiple = quartz / 5;

    return {
      rarityIndex: index,
      quartz,
      quartzBcoin: {
        price: HERO_QUARTZ[index].priceBcoin,
        priceEveryFiveQuartz:
          (HERO_QUARTZ[index].priceBcoin * bcoinInMainToken) / quartzMultiple,
        priceInMainToken: HERO_QUARTZ[index].priceBcoin * bcoinInMainToken,
      },
      quartzSen: {
        price: HERO_QUARTZ[index].priceSen,
        priceEveryFiveQuartz:
          (HERO_QUARTZ[index].priceSen * senInMainToken) / quartzMultiple,
        priceInMainToken: HERO_QUARTZ[index].priceSen * senInMainToken,
      },
      openSea: {
        id: openSea?.id,
        price: openSea?.openSeaPrice,
        priceEveryFiveQuartz: openSea
          ? openSea.openSeaPrice / quartzMultiple
          : undefined,
      },
      marketBcoin: {
        id: marketBcoin?.id,
        price: marketBcoin?.marketPrice,
        priceInMainToken: marketBcoin
          ? marketBcoin.marketPrice * bcoinInMainToken
          : undefined,
        priceEveryFiveQuartz: marketBcoin
          ? (marketBcoin.marketPrice * bcoinInMainToken) / quartzMultiple
          : undefined,
      },
    };
  }

  getBestRarity(items: any[]) {
    let bestRarity = null;
    let minPrice = Infinity;
    let bestSource = '';
    let heroId = '';

    items.forEach((item) => {
      const prices = {
        quartzBcoin: item.quartzBcoin.priceEveryFiveQuartz,
        quartzSen: item.quartzSen.priceEveryFiveQuartz,
        openSea: item.openSea.priceEveryFiveQuartz,
        marketBcoin: item.marketBcoin.priceEveryFiveQuartz,
      };

      for (const [source, price] of Object.entries(prices)) {
        if (price !== undefined && price < minPrice) {
          minPrice = price;
          bestRarity = item.rarityIndex;
          bestSource = source;
          heroId = item[source].id;
        }
      }
    });

    return {
      rarityIndex: bestRarity,
      source: bestSource,
      price: minPrice,
      heroId,
    };
  }
}
