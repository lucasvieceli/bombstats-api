import { DataSource, Repository } from 'typeorm';

import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { chunkArray } from '@/utils';
import { Injectable } from '@nestjs/common';
import { NAMES_TOKENS_IDS_MAP } from '@/utils/web3/reward';

export interface IGetBestCostOpenSea {
  id: string;
  rarityIndex: number;
  openSeaPrice: number;
}
export interface IGetBestCostMarket {
  id: string;
  rarityIndex: number;
  marketPrice: number;
}

@Injectable()
export class HeroRepository extends Repository<Hero> {
  constructor(private dataSource: DataSource) {
    super(Hero, dataSource.createEntityManager());
  }

  async updateOrInsert(heroData: Hero, network: WalletNetwork) {
    const hero = new Hero();
    hero.network = network;

    Object.assign(hero, heroData); // Assign properties from heroData to the new Hero instance

    if (!hero.id || !hero.network) {
      throw new Error('Both id and network must be set in the hero entity');
    }

    await this.upsert(hero, ['id', 'network']);

    return hero;
  }
  async updateOrInsertArray(heroData: Hero[], network: WalletNetwork) {
    const heroes = heroData
      .map((h) => {
        const hero = new Hero();
        hero.network = network;

        Object.assign(hero, h); // Assign properties from heroData to the new Hero instance

        if (hero.burned) {
          hero.marketPrice = null;
          hero.marketToken = null;
          hero.openSeaPrice = null;
          hero.stake = 0;
          hero.stakeSen = 0;
        }

        if (!hero.id || !hero.network) {
          return null;
        }
        return hero;
      })
      .filter((hero) => hero !== null);

    const heroesToUpsert = heroes.map((hero) => ({ ...hero }));

    // await this.upsert(heroesToUpsert, ['id', 'network']);
    const chunks = chunkArray(heroesToUpsert, 5000);
    for (const chunk of chunks) {
      await this.upsert(chunk, ['id', 'network']);
    }

    return heroes;
  }

  async getBestCostQuartzOpenSea(
    network: WalletNetwork,
  ): Promise<IGetBestCostOpenSea[]> {
    return await this.query(
      `
      SELECT
          h.id,
          h.rarityIndex,
          h.openSeaPrice,
          h.abilityHeroS
      FROM
          (
              SELECT 
                  hero.id,
                  hero.rarityIndex,
                  hero.openSeaPrice,
                  hero.abilityHeroS,
                  @row_number := IF(@rarityIndex = hero.rarityIndex, @row_number + 1, 1) AS rn,
                  @rarityIndex := hero.rarityIndex
              FROM
                  (SELECT @row_number := 0, @rarityIndex := 0) AS vars,
                  hero
              WHERE
                  hero.openSeaPrice IS NOT NULL 
                  AND hero.network = ?
                  AND JSON_CONTAINS(hero.abilityHeroS, '1', '$')
              ORDER BY 
                  hero.rarityIndex, 
                  hero.openSeaPrice
          ) AS h
      WHERE
          h.rn = 1
      ORDER BY
          h.rarityIndex, h.id;
    `,
      [network, '[]'],
    );
  }

  async getBestCostQuartzMarket(
    network: WalletNetwork,
    token: string,
  ): Promise<IGetBestCostMarket[]> {
    return await this.query(
      `
      SELECT
          h.id,
          h.rarityIndex,
          h.marketPrice
      FROM
          (
              SELECT 
                  hero.id,
                  hero.rarityIndex,
                  hero.marketPrice,
                  @row_number := IF(@rarityIndex = hero.rarityIndex, @row_number + 1, 1) AS rn,
                  @rarityIndex := hero.rarityIndex
              FROM
                  (SELECT @row_number := 0, @rarityIndex := 0) AS vars,
                  hero
              WHERE
                  hero.marketPrice IS NOT NULL 
                  AND hero.network = ?
                  AND LOWER(hero.marketToken) = ?
                 AND JSON_CONTAINS(hero.abilityHeroS, '1', '$')
              ORDER BY 
                  hero.rarityIndex, 
                  hero.marketPrice
          ) AS h
      WHERE
          h.rn = 1
      ORDER BY
          h.rarityIndex, h.id;
    `,
      [network, token.toLowerCase()],
    );
  }

  async removeHeroesFromMarket(ids: string[], network: WalletNetwork) {
    return await this.createQueryBuilder()
      .update()
      .set({
        marketPrice: null,
        marketToken: null,
      })
      .where('id NOT IN (:...ids) AND network = :network', { ids, network })
      .execute();
  }

  async getHeroesByRarityOrderedByUSD(
    network: WalletNetwork,
    rarity: number,
    tokensValues: Record<string, number>,
    quantity: number,
  ) {
    const queryBuilder = this.createQueryBuilder('hero');

    queryBuilder
      .where('hero.network = :network', { network })
      .andWhere('hero.rarityIndex = :rarity', { rarity })
      .andWhere(
        '(hero.openSeaPrice IS NOT NULL OR hero.marketPrice IS NOT NULL)',
      )
      .limit(quantity);

    let caseExpression = '(CASE';
    for (const [tokenAddress, tokenValue] of Object.entries(tokensValues)) {
      if (tokenValue) {
        caseExpression += ` WHEN LOWER(hero.marketToken) = LOWER('${tokenAddress}') THEN hero.marketPrice * ${tokenValue}`;
      }
    }
    caseExpression += ' ELSE hero.marketPrice END)';

    const leastExpression = `LEAST(${caseExpression}, COALESCE(hero.openSeaPrice * :openSeaTokenValue, hero.marketPrice))`;

    queryBuilder.addSelect(leastExpression, 'price_in_usd');

    const openSeaTokenValue = tokensValues[NAMES_TOKENS_IDS_MAP.MATIC] || 1;
    queryBuilder.setParameter('openSeaTokenValue', openSeaTokenValue);

    queryBuilder.andHaving('price_in_usd > 0');

    queryBuilder.orderBy('price_in_usd', 'ASC');

    return await queryBuilder.getMany();
  }
}
