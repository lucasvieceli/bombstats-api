import { WalletNetwork } from '@/database/models/Wallet';
import { chunkArray } from '@/utils';
import { ABI_HOUSE } from '@/utils/web3/ABI/house-abi';
import { ABI_MARKET } from '@/utils/web3/ABI/market';
import {
  getContractMultiCallBsc,
  getContractMultiCallPolygon,
  getRpcWeb3,
  isErrorRPC,
} from '@/utils/web3/web3';

export interface IHouse {
  id: string;
  index: number;
  rarity: number;
  recovery: number;
  capacity: number;
  blockNumber: number;
  name: string;
  wallet?: string;
}

export async function getHousesFromGenIds(genIds: string[]): Promise<IHouse[]> {
  return genIds.map((genId) => decodeHouse(genId));
}

function decodeHouse(genId: string): IHouse {
  const rarity = decodeRarity(genId);
  const result = {
    id: decodeHouseId(genId),
    index: decodeIndex(genId),
    rarity,
    recovery: decodeRecovery(genId),
    capacity: decodeCapacity(genId),
    blockNumber: decodeBlockNumber(genId),
    genId,
    name: parseNameHouse(rarity),
  };
  return result;
}

export function parseNameHouse(rarity: number) {
  return rarity in HOUSE_NAMES ? HOUSE_NAMES[rarity] : 'unknown';
}
export function parseEmojiHouse(rarity: number) {
  return rarity in HOUSE_EMOJI_MAP ? HOUSE_EMOJI_MAP[rarity] : 'unknown';
}
export const HOUSE_NAMES: Record<number, string> = {
  0: 'Tiny',
  1: 'Mini',
  2: 'Lux',
  3: 'Pent',
  4: 'Villa',
  5: 'Super Villa',
};

export const HOUSE_EMOJI_MAP: Record<string, string> = {
  0: process.env.EMOJI_TINY_HOUSE!,
  1: process.env.EMOJI_MINI_HOUSE!,
  2: process.env.EMOJI_LUX_HOUSE!,
  3: process.env.EMOJI_PENT_HOUSE!,
  4: process.env.EMOJI_VILLA_HOUSE!,
  5: process.env.EMOJI_PENT_HOUSE!,
};

export function decodeHouseId(details: string) {
  const detailsBigInt = BigInt(details);

  return (detailsBigInt & ((1n << 30n) - 1n)).toString();
}

function decodeIndex(details: string) {
  const detailsBigInt = BigInt(details);

  return Number((detailsBigInt >> 30n) & ((1n << 10n) - 1n));
}

function decodeRarity(details: string) {
  const detailsBigInt = BigInt(details);

  return Number((detailsBigInt >> 40n) & 31n);
}

function decodeRecovery(details: string) {
  const detailsBigInt = BigInt(details);

  return Number((detailsBigInt >> 45n) & ((1n << 15n) - 1n));
}

function decodeCapacity(details: string) {
  const detailsBigInt = BigInt(details);

  return Number((detailsBigInt >> 60n) & 31n);
}

function decodeBlockNumber(details: string) {
  const detailsBigInt = BigInt(details);

  return Number((detailsBigInt >> 145n) & ((1n << 30n) - 1n));
}

export interface IHouseOwner {
  house: IHouse;
  owner: string;
  market?: {
    tokenDetail: number;
    seller: string;
    price: number;
    startedAt: number;
    tokenAddress: string;
  };
}

export async function getHousesWithOwnerFromIds(
  ids: string[],
  network: WalletNetwork,
) {
  const chuncks = chunkArray<string>(ids, 150);

  let resultHeroes: IHouseOwner[] = [];
  for (const ids of chuncks) {
    const newHouses = await getHousesWithOwnerFromIdsFn(ids, network);
    resultHeroes = [...resultHeroes, ...newHouses].filter(
      (house) => house.house.id !== '0',
    );
  }

  return resultHeroes;
}

async function getHousesWithOwnerFromIdsFn(
  ids: string[],
  network: WalletNetwork,
): Promise<IHouseOwner[]> {
  try {
    const fnInstance = getRpcWeb3(network);
    const fnContractMult =
      network === WalletNetwork.BSC
        ? getContractMultiCallBsc(fnInstance)
        : getContractMultiCallPolygon(fnInstance);

    const contractAddressHouse =
      network === WalletNetwork.BSC
        ? process.env.CONTRACT_HOUSE_BSC
        : process.env.CONTRACT_HOUSE_POLYGON;
    const contractAddressMarket =
      network === WalletNetwork.BSC
        ? process.env.CONTRACT_HOUSE_MARKET_BSC
        : process.env.CONTRACT_HOUSE_MARKET_POLYGON;

    const contractHouse = new fnInstance.eth.Contract(
      ABI_HOUSE,
      contractAddressHouse,
    );
    const contractMarket = new fnInstance.eth.Contract(
      ABI_MARKET,
      contractAddressMarket,
    );

    const targets = [
      ...Array(ids.length).fill(contractAddressHouse),
      ...Array(ids.length).fill(contractAddressHouse),
      ...Array(ids.length).fill(contractAddressMarket),
    ];

    const data = [
      ...ids.map((id) => contractHouse.methods.tokenDetails(id).encodeABI()),
      ...ids.map((id) => contractHouse.methods.ownerOf(id).encodeABI()),
      ...ids.map((id) => contractMarket.methods.getOrderV2(id).encodeABI()),
    ];

    const result = (await fnContractMult.methods
      .multiCallExcept(targets, data)
      .call()) as any[];

    const houses = result
      .slice(0, ids.length)
      .map((r: any) => fnInstance.eth.abi.decodeParameter('uint256', r));
    const wallets = result.slice(ids.length, ids.length * 2).map((r: any) =>
      r.includes('184552433732313a20696e76616c696420746f6b656e2049440') //error
        ? null
        : fnInstance.eth.abi.decodeParameter('address', r),
    );

    const market = result.slice(ids.length * 2).map((r: any) => {
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
            { internalType: 'uint256', name: 'tokenDetail', type: 'uint256' },
            { internalType: 'address', name: 'seller', type: 'address' },
            { internalType: 'uint256', name: 'price', type: 'uint256' },
            { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
            { internalType: 'address', name: 'tokenAddress', type: 'address' },
          ],
          r,
        ) as any;
      const divisor = 10n ** 18n;
      return {
        tokenDetail,
        seller,
        price: Number(price) / Number(divisor),
        startedAt,
        tokenAddress,
      };
    });

    return houses.map((item, index) => {
      const marketResult = market[index];
      const owner = wallets[index] as string | null;

      return {
        house: decodeHouse(item.toString()),
        owner,
        market:
          marketResult?.seller?.toLowerCase() == owner?.toLowerCase()
            ? marketResult
            : null,
      };
    });
  } catch (e) {
    if (isErrorRPC(e)) {
      return getHousesWithOwnerFromIdsFn(ids, network);
    }

    throw e;
  }
}

export const HOUSE_TYPE_MAP = [
  {
    name: 'Tiny',
    size: '6x6',
    charge: 2,
    capacity: 4,
    image: '/images/houses/tiny.webp',
  },
  {
    name: 'Mini',
    size: '6x10',
    charge: 5,
    capacity: 6,
    image: '/images/houses/mini.webp',
  },
  {
    name: 'Lux',
    size: '6x15',
    charge: 8,
    capacity: 8,
    image: '/images/houses/lux.webp',
  },
  {
    name: 'Pent',
    size: '6x20',
    charge: 11,
    capacity: 10,
    image: '/images/houses/pent.webp',
  },
  {
    name: 'Villa',
    size: '6x25',
    charge: 14,
    capacity: 12,
    image: '/images/houses/villa.webp',
  },
  {
    name: 'Super Villa',
    size: '6x30',
    charge: 17,
    capacity: 14,
    image: '/images/houses/super-villa.webp',
  },
];
