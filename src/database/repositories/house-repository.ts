import { DataSource, Repository } from 'typeorm';

import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
import { Injectable } from '@nestjs/common';
import { NAMES_TOKENS_IDS_MAP } from '@/utils/web3/reward';

@Injectable()
export class HouseRepository extends Repository<House> {
  constructor(private dataSource: DataSource) {
    super(House, dataSource.createEntityManager());
  }

  async updateOrInsert(houseData: House, network: WalletNetwork) {
    const house = new House();
    house.network = network;

    Object.assign(house, houseData); // Assign properties from houseData to the new house instance

    if (!house.id || !house.network) {
      throw new Error('Both id and network must be set in the house entity');
    }

    await this.upsert(house, ['id', 'network']);

    return house;
  }
  async updateOrInsertArray(houseData: House[], network: WalletNetwork) {
    const houses = houseData
      .map((h) => {
        const house = new House();
        house.network = network;

        Object.assign(house, h); // Assign properties from houseData to the new house instance

        if (!house.id || !house.network) {
          return null;
        }
        return house;
      })
      .filter((house) => house !== null);
    const housesToUpsert = houses.map((house) => ({ ...house }));

    await this.upsert(housesToUpsert, ['id', 'network']);

    return houses;
  }

  async removeHousesFromMarket(ids: string[], network: WalletNetwork) {
    return await this.createQueryBuilder()
      .update()
      .set({
        marketPrice: null,
        marketToken: null,
      })
      .where('id NOT IN (:...ids) AND network = :network', { ids, network })
      .execute();
  }

  async getHousesByRarityOrderedByUSD(
    network: WalletNetwork,
    rarity: number,
    tokensValues: Record<string, number>,
    quantity: number,
  ) {
    const queryBuilder = this.createQueryBuilder('house');

    queryBuilder
      .where('house.network = :network', { network })
      .andWhere('house.rarity = :rarity', { rarity })
      .andWhere(
        '(house.openSeaPrice IS NOT NULL OR house.marketPrice IS NOT NULL)',
      )
      .limit(quantity);

    let caseExpression = '(CASE';
    for (const [tokenAddress, tokenValue] of Object.entries(tokensValues)) {
      caseExpression += ` WHEN LOWER(house.marketToken) = LOWER('${tokenAddress}') THEN house.marketPrice * ${tokenValue}`;
    }
    caseExpression += ' ELSE house.marketPrice END)';

    const leastExpression = `LEAST(${caseExpression}, COALESCE(house.openSeaPrice * :openSeaTokenValue, house.marketPrice))`;

    queryBuilder.addSelect(leastExpression, 'price_in_usd');

    const openSeaTokenValue = tokensValues[NAMES_TOKENS_IDS_MAP.MATIC] || 1;
    queryBuilder.setParameter('openSeaTokenValue', openSeaTokenValue);

    queryBuilder.andHaving('price_in_usd > 0');

    queryBuilder.orderBy('price_in_usd', 'ASC');

    return await queryBuilder.getMany();
  }
}
