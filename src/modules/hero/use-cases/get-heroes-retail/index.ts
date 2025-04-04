import { Hero, MarketPlace } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { IPaginateOptions, paginate } from '@/utils/paginate';
import { NAMES_TOKENS_IDS_MAP } from '@/utils/web3/reward';
import { Injectable } from '@nestjs/common';

export interface IGetHeroesRetail extends IPaginateOptions {
  network: WalletNetwork;
  ability?: Hero['abilities'];
  strength?: Hero['strength'];
  stamina?: Hero['stamina'];
  speed?: Hero['speed'];
  token?: string;
  abilityHeroS?: string[];
  rarity?: string[];
  amount?: number;
  stake?: number;
  stakeSen?: number;
  orderBy?:
    | 'strength'
    | 'stamina'
    | 'speed'
    | 'amount'
    | 'marketPlace'
    | 'stake'
    | 'stakeSen';
  marketplace?: MarketPlace[];
}

@Injectable()
export class GetHeroesRetail {
  constructor(private heroRepository: HeroRepository) {}

  async execute({
    network,
    ability,
    amount,
    marketplace,
    order,
    orderBy,
    speed,
    rarity,
    stamina,
    strength,
    token,
    stake,
    stakeSen,
    abilityHeroS,
    ...rest
  }: IGetHeroesRetail) {
    const queryBuilder = this.heroRepository
      .createQueryBuilder('hero')
      .where('hero.network = :network', { network });

    if (ability) {
      const abilitiesCondition = ability
        .map(
          (_, index) =>
            `JSON_CONTAINS(hero.abilities, JSON_ARRAY(:ability${index}), '$')`,
        )
        .join(' AND ');

      ability.forEach((value, index) => {
        queryBuilder.setParameter(`ability${index}`, value);
      });

      queryBuilder.andWhere(abilitiesCondition);
    }
    if (abilityHeroS && abilityHeroS.length > 0) {
      if (abilityHeroS.includes('1') && abilityHeroS.length === 1) {
        queryBuilder.andWhere(`JSON_LENGTH(hero.abilityHeroS) = 1`);
      }
      if (abilityHeroS.includes('0') && abilityHeroS.length === 1) {
        queryBuilder.andWhere(`JSON_LENGTH(hero.abilityHeroS) = 0`);
      }
    }

    if (amount && token) {
      if (token === NAMES_TOKENS_IDS_MAP.MATIC) {
        queryBuilder.andWhere('hero.openSeaPrice >= :amount', { amount });
      } else {
        queryBuilder
          .andWhere('hero.marketPrice >= :amount', { amount })
          .andWhere('hero.marketToken = :token', { token });
      }
    }

    if (marketplace?.length > 0) {
      if (marketplace.length === 1) {
        if (marketplace.includes(MarketPlace.OPENSEA)) {
          queryBuilder.andWhere('hero.openSeaPrice IS NOT NULL');
        }
        if (marketplace.includes(MarketPlace.MARKET)) {
          queryBuilder.andWhere('hero.marketPrice IS NOT NULL');
        }
      } else {
        queryBuilder.andWhere(
          '(hero.marketPrice IS NOT NULL OR hero.openSeaPrice IS NOT NULL)',
        );
      }
    } else {
      queryBuilder.andWhere(
        '(hero.marketPrice IS NOT NULL OR hero.openSeaPrice IS NOT NULL)',
      );
    }

    if (speed) {
      queryBuilder.andWhere('hero.speed >= :speed', { speed });
    }

    if (rarity) {
      queryBuilder.andWhere('hero.rarityIndex IN (:...rarity)', {
        rarity: rarity.map(Number),
      });
    }

    if (stamina) {
      queryBuilder.andWhere('hero.stamina >= :stamina', { stamina });
    }
    if (stake) {
      queryBuilder.andWhere('hero.stake >= :stake', { stake });
    }
    if (stakeSen) {
      queryBuilder.andWhere('hero.stakeSen >= :stakeSen', { stakeSen });
    }

    if (strength) {
      queryBuilder.andWhere('hero.strength >= :strength', { strength });
    }

    if (orderBy) {
      if (orderBy === 'marketPlace') {
        queryBuilder
          .orderBy('hero.openSeaPrice IS NOT NULL', 'DESC')
          .addOrderBy('hero.marketPrice IS NOT NULL', 'DESC');
      } else if (orderBy === 'amount') {
        queryBuilder.orderBy(
          'COALESCE(hero.openSeaPrice, hero.marketPrice)',
          order,
        );
      } else {
        console.log(`hero.${orderBy}`, order);
        queryBuilder.orderBy(`hero.${orderBy}`, order);
      }
    }

    return paginate<Hero>({ queryBuilder, ...rest } as any);
  }
}
