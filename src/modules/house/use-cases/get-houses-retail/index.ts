import { MarketPlace } from '@/database/models/Hero';
import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
import { HouseRepository } from '@/database/repositories/house-repository';
import { IPaginateOptions, paginate } from '@/utils/paginate';
import { NAMES_TOKENS_IDS_MAP } from '@/utils/web3/reward';
import { Injectable } from '@nestjs/common';

export interface IGetHousesRetail extends IPaginateOptions {
  network: WalletNetwork;
  token?: string;
  rarity?: string[];
  amount?: number;
  orderBy?: 'amount' | 'marketPlace';
  marketplace?: MarketPlace[];
}

@Injectable()
export class GetHousesRetail {
  constructor(private houseRepository: HouseRepository) {}

  async execute({
    network,
    amount,
    marketplace,
    order,
    orderBy,
    rarity,
    token,
    ...rest
  }: IGetHousesRetail) {
    const queryBuilder = this.houseRepository
      .createQueryBuilder('house')
      .where('house.network = :network', { network });

    if (amount && token) {
      if (token === NAMES_TOKENS_IDS_MAP.MATIC) {
        queryBuilder.andWhere('house.openSeaPrice >= :amount', { amount });
      } else {
        queryBuilder
          .andWhere('house.marketPrice >= :amount', { amount })
          .andWhere('house.marketToken = :token', { token });
      }
    }

    if (marketplace?.length > 0) {
      if (marketplace.length === 1) {
        if (marketplace.includes(MarketPlace.OPENSEA)) {
          queryBuilder.andWhere('house.openSeaPrice IS NOT NULL');
        }
        if (marketplace.includes(MarketPlace.MARKET)) {
          queryBuilder.andWhere('house.marketPrice IS NOT NULL');
        }
      } else {
        queryBuilder.andWhere(
          '(house.marketPrice IS NOT NULL OR house.openSeaPrice IS NOT NULL)',
        );
      }
    } else {
      queryBuilder.andWhere(
        '(house.marketPrice IS NOT NULL OR house.openSeaPrice IS NOT NULL)',
      );
    }

    if (rarity) {
      queryBuilder.andWhere('house.rarity IN (:...rarity)', {
        rarity: rarity.map(Number),
      });
    }

    if (orderBy) {
      if (orderBy === 'marketPlace') {
        queryBuilder
          .orderBy('house.openSeaPrice IS NOT NULL', 'DESC')
          .addOrderBy('house.marketPrice IS NOT NULL', 'DESC');
      } else if (orderBy === 'amount') {
        queryBuilder.orderBy(
          'COALESCE(house.openSeaPrice, house.marketPrice)',
          order,
        );
      } else {
        queryBuilder.orderBy(`house.${orderBy}`, order);
      }
    }

    return paginate<House>({ queryBuilder, ...rest } as any);
  }
}
