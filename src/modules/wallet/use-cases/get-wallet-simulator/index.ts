import { MarketPlace } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { HouseRepository } from '@/database/repositories/house-repository';
import { TotalsRepository } from '@/database/repositories/totals-repository';
import { NAMES_TOKENS_IDS_MAP } from '@/utils/web3/reward';
import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';

export interface IGetWalletSimulator {
  quantityHeroes: {
    rarity: number;
    quantity: number;
    stakeBcoin: number;
    stakeSen: number;
  }[];
  houseRarity: number;
  network: WalletNetwork;
}

@Injectable()
export class GetWalletSimulator {
  constructor(
    private totalsRepository: TotalsRepository,
    private heroRepository: HeroRepository,
    private houseRepository: HouseRepository,
  ) {}

  async execute({ houseRarity, quantityHeroes, network }: IGetWalletSimulator) {
    const tokens = await this.totalsRepository.find({
      where: {
        network,
        name: In(['sens', 'matic', 'bcoin', 'bnb']),
      },
    });

    const tokensValues = {
      [NAMES_TOKENS_IDS_MAP.MATIC]: Number(
        tokens?.find((r) => r.name === 'matic')?.value || 0,
      ),
      [NAMES_TOKENS_IDS_MAP.BCOIN_BSC]: Number(
        tokens?.find((r) => r.name === 'bnb')?.value,
      ),
      [NAMES_TOKENS_IDS_MAP.BCOIN_POLYGON]: Number(
        tokens?.find((r) => r.name === 'bcoin')?.value,
      ),
      [NAMES_TOKENS_IDS_MAP.BCOIN_BSC]: Number(
        tokens?.find((r) => r.name === 'bcoin')?.value,
      ),
      [NAMES_TOKENS_IDS_MAP.SEN_POLYGON]: Number(
        tokens?.find((r) => r.name === 'sens')?.value,
      ),
      [NAMES_TOKENS_IDS_MAP.SEN_BSC]: Number(
        tokens?.find((r) => r.name === 'sens')?.value,
      ),
    };

    const tokenBcoin = (
      network === WalletNetwork.POLYGON
        ? NAMES_TOKENS_IDS_MAP.BCOIN_POLYGON
        : NAMES_TOKENS_IDS_MAP.BCOIN_BSC
    ).toLowerCase();

    const tokenSen = (
      network === WalletNetwork.POLYGON
        ? NAMES_TOKENS_IDS_MAP.SEN_POLYGON
        : NAMES_TOKENS_IDS_MAP.SEN_BSC
    ).toLowerCase();

    const heroes = (
      await Promise.all(
        quantityHeroes.map((hero) => {
          return this.heroRepository.getHeroesByRarityOrderedByUSD(
            network,
            hero.rarity,
            tokensValues,
            hero.quantity,
          );
        }),
      )
    )
      .flat()
      .sort((a, b) => a.rarityIndex - b.rarityIndex)
      .map((h) => {
        const rarityParam = quantityHeroes.find(
          (r) => r.rarity === h.rarityIndex,
        );

        const matic = h.openSeaPrice * tokensValues[NAMES_TOKENS_IDS_MAP.MATIC];
        const other = h.marketPrice * tokensValues[h.marketToken.toLowerCase()];

        const stakeBcoinUSD =
          rarityParam?.stakeSen > 0
            ? rarityParam.stakeBcoin * tokensValues[tokenBcoin]
            : 0;
        const stakeSenUSD =
          rarityParam?.stakeSen > 0
            ? rarityParam?.stakeSen * tokensValues[tokenSen]
            : 0;

        const tokens = {};

        if (matic != 0 && matic < other) {
          tokens[NAMES_TOKENS_IDS_MAP.MATIC.toLowerCase()] = h.openSeaPrice;
        } else {
          tokens[h.marketToken.toLowerCase()] = h.marketPrice;
        }

        tokens[tokenBcoin] = Number(rarityParam.stakeBcoin);
        tokens[tokenSen] = Number(rarityParam.stakeSen);

        return {
          hero: h,
          tokens,
          valueUSD:
            (matic != 0 && matic < other ? matic : other) +
            stakeSenUSD +
            stakeBcoinUSD,
          marketplace:
            matic != 0 && matic < other
              ? MarketPlace.OPENSEA
              : MarketPlace.MARKET,
          stakeSen: rarityParam.stakeSen,
          stakeBcoin: rarityParam.stakeBcoin,
        };
      });

    const house = (
      await this.houseRepository.getHousesByRarityOrderedByUSD(
        network,
        houseRarity,
        tokensValues,
        1,
      )
    ).map((h) => {
      const matic = h.openSeaPrice * tokensValues[NAMES_TOKENS_IDS_MAP.MATIC];
      const other = h.marketPrice * tokensValues[h.marketToken.toLowerCase()];

      return {
        house: h,
        token:
          matic != 0 && matic < other
            ? NAMES_TOKENS_IDS_MAP.MATIC.toLowerCase()
            : h.marketToken.toLowerCase(),
        valueUSD: matic != 0 && matic < other ? matic : other,
        marketplace:
          matic != 0 && matic < other
            ? MarketPlace.OPENSEA
            : MarketPlace.MARKET,
        value: matic != 0 && matic < other ? h.openSeaPrice : h.marketPrice,
      };
    });

    return {
      heroes,
      house: house?.[0],
      tokens: tokensValues,
    };
  }
}
