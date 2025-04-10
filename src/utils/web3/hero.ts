import { WalletNetwork } from '@/database/models/Wallet';
import { chunkArray } from '@/utils';
import { ABI_HERO } from '@/utils/web3/ABI/hero-abi';
import { ABI_MARKET } from '@/utils/web3/ABI/market';
import { ABI_STAKE } from '@/utils/web3/ABI/stake-abi';
import { getMultiCalls } from '@/utils/web3/multi-calls';
import { NAMES_TOKENS_IDS_MAP } from '@/utils/web3/reward';
import {
  getContractMultiCallBsc,
  getContractMultiCallPolygon,
  getRpcWeb3,
  isErrorRPC,
} from '@/utils/web3/web3';
import { Logger } from '@nestjs/common';

export interface IHero {
  id: string;
  index: number;
  rarity: string;
  raritySimbol: string;
  rarityIndex: number;
  level: number;
  variant: number;
  skin: string;
  skinValue: number;
  stamina: number;
  speed: number;
  bombSkin: number;
  skillCount: number;
  capacity: number;
  strength: number;
  range: number;
  blockNumber: number;
  randomizeAbilityCounter: number;
  numUpgradeShieldLevel: number;
  numResetShield: number;
  abilities: string[];
  abilityHeroS: number[];
  maxShield: number;
  stake: number;
  burned: boolean;
  genId: number;
  wallet?: string;
}

export async function getHeroesFromGenIds(
  genIds: number[],
  network: WalletNetwork,
) {
  const heroIds = genIds.map((genId) => decodeIdHero(genId));

  const stakes = await getMultiStake(heroIds, network);

  return Promise.all(
    heroIds.map((id, index) => decodeHero(genIds[index], stakes[index], id)),
  );
}

export async function getHeroesFromIds(
  ids: number[] | string[],
  network: WalletNetwork,
) {
  try {
    const fnInstance = getRpcWeb3(network);
    const fnContractMult =
      network === WalletNetwork.BSC
        ? getContractMultiCallBsc(fnInstance)
        : getContractMultiCallPolygon(fnInstance);

    const contractAddressHero =
      network === WalletNetwork.BSC
        ? process.env.CONTRACT_HERO_BSC
        : process.env.CONTRACT_HERO_POLYGON;
    const contractAddressStake =
      network == WalletNetwork.POLYGON
        ? process.env.CONTRACT_STAKE_POLYGON
        : process.env.CONTRACT_STAKE_BSC;

    const contractHero = new fnInstance.eth.Contract(
      ABI_HERO,
      contractAddressHero,
    );
    const contractStake = new fnInstance.eth.Contract(
      ABI_STAKE,
      contractAddressStake,
    );

    const targets = [
      ...Array(ids.length).fill(contractAddressHero),
      ...Array(ids.length).fill(contractAddressStake),
    ];

    const data = [
      ...ids.map((id) => contractHero.methods.tokenDetails(id).encodeABI()),
      ...ids.map((id) =>
        contractStake.methods.getCoinBalancesByHeroId(id).encodeABI(),
      ),
    ];
    const divisor = 10n ** 18n;

    const result = (await fnContractMult.methods
      .multiCallExcept(targets, data)
      .call()) as any[];

    const heroes = result
      .slice(0, ids.length)
      .map((r: any) => fnInstance.eth.abi.decodeParameter('uint256', r));
    const stakes = result
      .slice(ids.length)
      .map((r: any) => fnInstance.eth.abi.decodeParameter('uint256', r));
    return Promise.all(
      heroes.map((h: any, index: number) =>
        decodeHero(h, Number(stakes[index]) / Number(divisor)),
      ),
    );
  } catch (e) {
    if (isErrorRPC(e)) {
      return getHeroesFromIds(ids, network);
    }
    throw e;
  }
}

async function getMultiStake(
  heroIds: string[] | number[],
  network: WalletNetwork,
) {
  const result = await getMultiCalls({
    abi: ABI_STAKE,
    contractAddress:
      network == WalletNetwork.POLYGON
        ? process.env.CONTRACT_STAKE_POLYGON
        : process.env.CONTRACT_STAKE_BSC,
    methodName: 'getCoinBalancesByHeroId',
    network,
    params: heroIds,
  });

  const divisor = 10n ** 18n;

  return result.map((r: any) => Number(r / divisor));
}

export async function decodeHero(
  details: any,
  stake: number,
  heroId?: any,
): Promise<IHero> {
  const detailsBigInt = BigInt(details);

  const decodeValue = (bitPosition: number, bitSize: number) =>
    Number(
      (detailsBigInt >> BigInt(bitPosition)) & ((1n << BigInt(bitSize)) - 1n),
    );

  const rarity = decodeRarity(details);
  const result = {
    id: heroId.toString() || decodeIdHero(details),
    index: decodeIndex(details),
    rarity: parseHeroRarity(rarity),
    raritySimbol: parseHeroRaritySimbol(rarity),
    rarityIndex: rarity,
    level: decodeLevel(details),
    variant: decodeValue(50, 5),
    skin: parseHeroSkin(decodeValue(55, 5)),
    skinValue: decodeValue(55, 5),
    stamina: decodeValue(60, 5),
    speed: decodeValue(65, 5),
    bombSkin: decodeValue(70, 5),
    skillCount: decodeValue(75, 5),
    capacity: decodeValue(75, 5),
    strength: decodeValue(80, 5),
    range: decodeValue(85, 5),
    blockNumber: decodeBlockNumber(details),
    randomizeAbilityCounter: decodeRandomizeAbilityCounter(details),
    numUpgradeShieldLevel: decodeValue(235, 5),
    numResetShield: decodeValue(240, 10),
    abilities: [] as string[],
    abilityHeroS: [] as number[],
    maxShield: SHIELD_LEVEL[rarity + 1][decodeValue(235, 5) + 1],
    stake,
    burned: details == 0,
    genId: details.toString(),
  };

  const abilityCount = decodeValue(90, 5);
  for (let i = 0; i < abilityCount; i++) {
    const ability = parseHeroSkill(decodeValue(95 + i * 5, 5));
    result.abilities.push(ability);
  }

  const abilitySizeHeroS = decodeValue(180, 5);
  for (let j = 0; j < abilitySizeHeroS; j++) {
    result.abilityHeroS.push(decodeValue(185 + j * 5, 5));
  }

  return result;
}

export function parseHeroSkill(skill: number) {
  return skill in HERO_SKILL_MAP ? HERO_SKILL_MAP[skill] : 'Unknown';
}

function decodeRarity(details: number) {
  const detailsBigInt = BigInt(details);
  const rarityBitPosition = 40;
  const rarityBitSize = 5;

  const rarityIndex = Number(
    (detailsBigInt >> BigInt(rarityBitPosition)) &
      ((1n << BigInt(rarityBitSize)) - 1n),
  );

  return rarityIndex;
}

export function decodeIdHero(details: number) {
  const detailsBigInt = BigInt(details);
  const idBitPosition = 0;
  const idBitSize = 30;

  const id = Number(
    (detailsBigInt >> BigInt(idBitPosition)) & ((1n << BigInt(idBitSize)) - 1n),
  );

  return id.toString();
}
function decodeLevel(details: number) {
  const detailsBigInt = BigInt(details);
  const levelBitPosition = 45;
  const levelBitSize = 5;

  const level = Number(
    (detailsBigInt >> BigInt(levelBitPosition)) &
      ((1n << BigInt(levelBitSize)) - 1n),
  );

  return level;
}
function decodeIndex(details: number) {
  const detailsBigInt = BigInt(details);
  const indexBitPosition = 30;
  const indexBitSize = 10;

  const index = Number(
    (detailsBigInt >> BigInt(indexBitPosition)) &
      ((1n << BigInt(indexBitSize)) - 1n),
  );

  return index;
}
function decodeBlockNumber(details: number) {
  const detailsBigInt = BigInt(details);
  const blockNumberBitPosition = 245;
  const blockNumberBitSize = 32;

  const blockNumber = Number(
    (detailsBigInt >> BigInt(blockNumberBitPosition)) &
      ((1n << BigInt(blockNumberBitSize)) - 1n),
  );

  return blockNumber;
}
function decodeRandomizeAbilityCounter(details: number) {
  const detailsBigInt = BigInt(details);
  const randomizeAbilityCounterBitPosition = 277;
  const randomizeAbilityCounterBitSize = 16;

  const randomizeAbilityCounter = Number(
    (detailsBigInt >> BigInt(randomizeAbilityCounterBitPosition)) &
      ((1n << BigInt(randomizeAbilityCounterBitSize)) - 1n),
  );

  return randomizeAbilityCounter;
}

export function parseHeroRarity(rarity: number) {
  return HERO_RARITY_ARRAY[rarity] || 'Unknown';
}
export function parseHeroRaritySimbol(rarity: number) {
  return HERO_RARITY_SIMBOL[rarity] || 'Unknown';
}

function parseHeroSkin(skin: number) {
  return skin in HERO_SKIN_MAP ? HERO_SKIN_MAP[skin] : 'Unknown';
}

export const HERO_RARITY_SIMBOL = ['C', 'R', 'SR', 'E', 'L', 'SL'];

export const HERO_RARITY_ARRAY: string[] = [
  'Common',
  'Rare',
  'Super Rare',
  'Epic',
  'Legend',
  'Super Legend',
];

export const HERO_SKIN_MAP: Record<number, string> = {
  1: 'Frog',
  2: 'Knight',
  3: 'Cowboy',
  4: 'Vampire',
  5: 'Witch',
  6: 'Doge',
  7: 'Pepe',
  8: 'Ninja',
  9: 'King',
  10: 'Rabbit',
  14: 'Cat',
  15: 'Tiger',
  16: 'Pug Dog',
};

export const HERO_MINIMUM_STAKE = {
  sens: [300, 971, 1942, 3884, 9709, 19417],
  bcoin: [80, 194, 388, 777, 1942, 3883],
};

export const HERO_QUARTZ = [
  { generate: 5, priceBcoin: 25, priceSen: 125 },
  {
    generate: 10,
    priceBcoin: 50,
    priceSen: 250,
  },
  {
    generate: 20,
    priceBcoin: 100,
    priceSen: 500,
  },
  {
    generate: 35,
    priceBcoin: 175,
    priceSen: 875,
  },
  {
    generate: 55,
    priceBcoin: 275,
    priceSen: 1375,
  },
  {
    generate: 80,
    priceBcoin: 400,
    priceSen: 2000,
  },
];

export const HERO_SKIN_MAP_IMAGE: Record<number, Record<number, string>> = {
  1: {
    1: '/images/heroes/frog_blue.webp',
    2: '/images/heroes/frog_green.webp',
    4: '/images/heroes/frog_purple.webp',
    5: '/images/heroes/frog_yellow.webp',
    6: '/images/heroes/frog_red.webp',
  },
  2: {
    1: '/images/heroes/knight_blue.webp',
    2: '/images/heroes/knight_green.webp',
    3: '/images/heroes/knight_white.webp',
    4: '/images/heroes/knight_white.webp',
    5: '/images/heroes/knight_yellow.webp',
    6: '/images/heroes/knight_red.webp',
  },
  3: {
    1: '/images/heroes/man_blue.webp',
    2: '/images/heroes/man_green.webp',
    3: '/images/heroes/man_white.webp',
    4: '/images/heroes/man_white.webp',
    5: '/images/heroes/man_yellow.webp',
    6: '/images/heroes/man_red.webp',
  },
  4: {
    1: '/images/heroes/vampire_blue.webp',
    2: '/images/heroes/vampire_green.webp',
    4: '/images/heroes/vampire_purple.webp',
    3: '/images/heroes/vampire_red.webp',
    5: '/images/heroes/vampire_yellow.webp',
    6: '/images/heroes/vampire_red.webp',
  },
  5: {
    1: '/images/heroes/witch_blue.webp',
    2: '/images/heroes/witch_green.webp',
    4: '/images/heroes/witch_purple.webp',
    5: '/images/heroes/witch_yellow.webp',
    6: '/images/heroes/witch_red.webp',
  },
  6: {
    1: '/images/heroes/doge.webp',
    2: '/images/heroes/doge.webp',
    3: '/images/heroes/doge.webp',
    4: '/images/heroes/doge.webp',
    5: '/images/heroes/doge.webp',
  },
  7: {
    1: '/images/heroes/pepe.webp',
    2: '/images/heroes/pepe.webp',
    3: '/images/heroes/pepe.webp',
    4: '/images/heroes/pepe.webp',
    5: '/images/heroes/pepe.webp',
  },
  8: {
    1: '/images/heroes/ninja.webp',
    2: '/images/heroes/ninja.webp',
    3: '/images/heroes/ninja.webp',
    4: '/images/heroes/ninja.webp',
    5: '/images/heroes/ninja.webp',
  },
  9: {
    1: '/images/heroes/king.webp',
    2: '/images/heroes/king.webp',
    3: '/images/heroes/king.webp',
    4: '/images/heroes/king.webp',
    5: '/images/heroes/king.webp',
  },
  10: {
    1: '/images/heroes/rabbit.webp',
    2: '/images/heroes/rabbit.webp',
    3: '/images/heroes/rabbit.webp',
    4: '/images/heroes/rabbit.webp',
    5: '/images/heroes/rabbit.webp',
  },
  14: {
    1: '/images/heroes/cat.webp',
    2: '/images/heroes/cat.webp',
    3: '/images/heroes/cat.webp',
    4: '/images/heroes/cat.webp',
    5: '/images/heroes/cat.webp',
  },
  15: {
    1: '/images/heroes/tiger.webp',
    2: '/images/heroes/tiger.webp',
    3: '/images/heroes/tiger.webp',
    4: '/images/heroes/tiger.webp',
    5: '/images/heroes/tiger.webp',
  },
  16: {
    1: '/images/heroes/pug.webp',
    2: '/images/heroes/pug.webp',
    3: '/images/heroes/pug.webp',
    4: '/images/heroes/pug.webp',
    5: '/images/heroes/pug.webp',
  },
};

export function parseHeroSkinImage(
  skin: number,
  variant: number,
  burned?: boolean,
) {
  if (burned) {
    return '/images/heroes/burned.webp';
  }
  return skin in HERO_SKIN_MAP_IMAGE && variant in HERO_SKIN_MAP_IMAGE[skin]
    ? HERO_SKIN_MAP_IMAGE[skin][variant]
    : '/images/heroes/man_white.webp';
}

export const HERO_SKILL_MAP: Record<number, string> = {
  1: 'ADOnChestExplosion',
  2: 'ADOnCageExplosion',
  3: 'BlockPiercing',
  4: 'EnergyShield',
  5: 'Battery',
  6: 'WalkThroughBomb',
  7: 'WalkThroughBlock',
};

const SHIELD_LEVEL: any = {
  1: {
    1: 1000,
    2: 2000,
    3: 3000,
    4: 4000,
  },
  2: {
    1: 1125,
    2: 2250,
    3: 3375,
    4: 4500,
  },
  3: {
    1: 1250,
    2: 2500,
    3: 3750,
    4: 5000,
  },
  4: {
    1: 1500,
    2: 3000,
    3: 4500,
    4: 6000,
  },
  5: {
    1: 1750,
    2: 3500,
    3: 5250,
    4: 7000,
  },
  6: {
    1: 2000,
    2: 4000,
    3: 6000,
    4: 8000,
  },
};

export interface IHeroStakeOwner {
  hero: IHero;
  owner: string;
  stake: number;
  stakeSen: number;
  market?: {
    tokenDetail: number;
    seller: string;
    price: number;
    startedAt: number;
    tokenAddress: string;
  };
}

export async function getHeroesWithStakeOwnerFromIds(
  ids: string[],
  network: WalletNetwork,
  log: boolean = false,
) {
  const chunks = chunkArray<string>(ids, 150);

  let resultHeroes: IHeroStakeOwner[] = [];

  // const promises = chunks.map((ids) => async () => {
  //   const newHeroes = await getHeroesWithStakeOwnerFromIdsFn(ids, network);
  //   resultHeroes = [...resultHeroes, ...newHeroes];
  // });

  // await executePromisesBlock(
  //   promises,
  //   5,
  //   'all',
  //   0,
  //   log ? 'getHeroesWithStakeOwnerFromIds' : undefined,
  // );

  // return resultHeroes;
  let count = 0;
  for (const ids of chunks) {
    if (log) {
      count++;
      Logger.debug(
        `total ${count}/${chunks.length}`,
        'getHeroesWithStakeOwnerFromIds',
      );
    }

    const newHeroes = await getHeroesWithStakeOwnerFromIdsFn(ids, network);
    resultHeroes = [...resultHeroes, ...newHeroes];
  }

  return resultHeroes;
}
async function getHeroesWithStakeOwnerFromIdsFn(
  ids: string[],
  network: WalletNetwork,
): Promise<IHeroStakeOwner[]> {
  let timeout: NodeJS.Timeout;
  try {
    // Cria uma promessa que será rejeitada após 2000ms (2 segundos)
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        console.log('evm timeout');
        reject(new Error('evm timeout'));
      }, 15 * 1000);
    });

    const mainPromise = (async () => {
      const fnInstance = getRpcWeb3(network);
      const fnContractMult =
        network === WalletNetwork.BSC
          ? getContractMultiCallBsc(fnInstance)
          : getContractMultiCallPolygon(fnInstance);

      const contractAddressHero =
        network === WalletNetwork.BSC
          ? process.env.CONTRACT_HERO_BSC
          : process.env.CONTRACT_HERO_POLYGON;
      const contractAddressStake =
        network == WalletNetwork.POLYGON
          ? process.env.CONTRACT_STAKE_POLYGON
          : process.env.CONTRACT_STAKE_BSC;
      const contractAddressMarket =
        network === WalletNetwork.BSC
          ? process.env.CONTRACT_HERO_MARKET_BSC
          : process.env.CONTRACT_HERO_MARKET_POLYGON;

      const contractHero = new fnInstance.eth.Contract(
        ABI_HERO,
        contractAddressHero,
      );
      const contractStake = new fnInstance.eth.Contract(
        ABI_STAKE,
        contractAddressStake,
      );
      const contractMarket = new fnInstance.eth.Contract(
        ABI_MARKET,
        contractAddressMarket,
      );

      const targets = [
        ...Array(ids.length).fill(contractAddressHero),
        ...Array(ids.length).fill(contractAddressHero),
        ...Array(ids.length).fill(contractAddressStake),
        ...Array(ids.length).fill(contractAddressMarket),
        ...Array(ids.length).fill(contractAddressStake),
      ];

      const bcoinToken =
        network === WalletNetwork.BSC
          ? NAMES_TOKENS_IDS_MAP.BCOIN_BSC
          : NAMES_TOKENS_IDS_MAP.BCOIN_POLYGON;
      const senToken =
        network === WalletNetwork.BSC
          ? NAMES_TOKENS_IDS_MAP.SEN_BSC
          : NAMES_TOKENS_IDS_MAP.SEN_POLYGON;

      const data = [
        ...ids.map((id) => contractHero.methods.tokenDetails(id).encodeABI()),
        ...ids.map((id) => contractHero.methods.ownerOf(id).encodeABI()),
        ...ids.map((id) =>
          contractStake.methods.getCoinBalanceV2(bcoinToken, id).encodeABI(),
        ),
        ...ids.map((id) => contractMarket.methods.getOrderV2(id).encodeABI()),
        ...ids.map((id) =>
          contractStake.methods.getCoinBalanceV2(senToken, id).encodeABI(),
        ),
      ];

      const result = (await fnContractMult.methods
        .multiCallExcept(targets, data)
        .call()) as any[];

      const heroes = result
        .slice(0, ids.length)
        .map((r: any) => fnInstance.eth.abi.decodeParameter('uint256', r));
      const wallets = result.slice(ids.length, ids.length * 2).map((r: any) =>
        r.includes('184552433732313a20696e76616c696420746f6b656e2049440') //error
          ? null
          : fnInstance.eth.abi.decodeParameter('address', r),
      );
      const stakes = result
        .slice(ids.length * 2, ids.length * 3)
        .map((r: any) => fnInstance.eth.abi.decodeParameter('uint256', r));

      const divisor = 10n ** 18n;

      const market = result
        .slice(ids.length * 3, ids.length * 4)
        .map((r: any) => {
          if (
            r.includes(
              '116f72646572206e6f742065786973746564000000000000000000000000000000',
            )
          ) {
            return null;
          }
          const { tokenDetail, seller, price, startedAt, tokenAddress } =
            fnInstance.eth.abi.decodeParameters(
              [
                {
                  internalType: 'uint256',
                  name: 'tokenDetail',
                  type: 'uint256',
                },
                { internalType: 'address', name: 'seller', type: 'address' },
                { internalType: 'uint256', name: 'price', type: 'uint256' },
                { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
                {
                  internalType: 'address',
                  name: 'tokenAddress',
                  type: 'address',
                },
              ],
              r,
            ) as any;

          return {
            tokenDetail,
            seller,
            price: Number(price) / Number(divisor),
            startedAt,
            tokenAddress,
          };
        });

      const stakesSen = result
        .slice(ids.length * 4)
        .map((r: any) => fnInstance.eth.abi.decodeParameter('uint256', r));

      return await Promise.all(
        heroes.map(async (item, index) => {
          const marketResult = market[index];
          const owner = wallets[index] as string | null;

          return {
            hero: await decodeHero(
              item,
              Number((stakes[index] as any) / divisor),
              ids[index],
            ),
            owner,
            stake: Number((stakes[index] as any) / divisor),
            stakeSen: Number((stakesSen[index] as any) / divisor),
            market:
              marketResult?.seller?.toLowerCase() == owner?.toLowerCase()
                ? marketResult
                : null,
          };
        }),
      );
    })();

    const result = await Promise.race([mainPromise, timeoutPromise]);

    clearTimeout(timeout);
    return result;
  } catch (e) {
    if (timeout) {
      clearTimeout(timeout);
    }
    if (isErrorRPC(e)) {
      return getHeroesWithStakeOwnerFromIdsFn(ids, network);
    }

    throw e;
  }
}
