import { WalletNetwork } from '@/database/models/Wallet';
import { chunkArray } from '@/utils';
import { ABI_HOUSE } from '@/utils/web3/ABI/house-abi';
import {
  getContractMultiCallBsc,
  getContractMultiCallPolygon,
  getRpcWeb3,
  isErrorRPC,
} from '@/utils/web3/web3';

export interface IHouse {
  id: number;
  index: number;
  rarity: number;
  recovery: number;
  capacity: number;
  blockNumber: number;
  name: string;
  wallet?: string;
}

export async function getHousesFromGenIds(genIds: number[]): Promise<IHouse[]> {
  return genIds.map((genId) => decodeHouse(genId));
}

function decodeHouse(details: number): IHouse {
  const detailsBigInt = BigInt(details);
  const rarity = decodeRarity(detailsBigInt);
  const result = {
    id: decodeHouseId(detailsBigInt),
    index: decodeIndex(detailsBigInt),
    rarity,
    recovery: decodeRecovery(detailsBigInt),
    capacity: decodeCapacity(detailsBigInt),
    blockNumber: decodeBlockNumber(detailsBigInt),
    genId: details.toString(),
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

export function decodeHouseId(detailsBigInt: bigint) {
  return Number(detailsBigInt & ((1n << 30n) - 1n));
}

function decodeIndex(detailsBigInt: bigint) {
  return Number((detailsBigInt >> 30n) & ((1n << 10n) - 1n));
}

function decodeRarity(detailsBigInt: bigint) {
  return Number((detailsBigInt >> 40n) & 31n);
}

function decodeRecovery(detailsBigInt: bigint) {
  return Number((detailsBigInt >> 45n) & ((1n << 15n) - 1n));
}

function decodeCapacity(detailsBigInt: bigint) {
  return Number((detailsBigInt >> 60n) & 31n);
}

function decodeBlockNumber(detailsBigInt: bigint) {
  return Number((detailsBigInt >> 145n) & ((1n << 30n) - 1n));
}

export interface IHouseOwner {
  house: IHouse;
  owner: string;
}

export async function getHousesWithOwnerFromIds(
  ids: number[],
  network: WalletNetwork,
) {
  const chuncks = chunkArray<number>(ids, 300);

  let resultHeroes: IHouseOwner[] = [];
  for (const ids of chuncks) {
    const newHouses = await getHousesWithOwnerFromIdsFn(ids, network);
    resultHeroes = [...resultHeroes, ...newHouses];
  }

  return resultHeroes;
}

async function getHousesWithOwnerFromIdsFn(
  ids: number[],
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

    const contractHouse = new fnInstance.eth.Contract(
      ABI_HOUSE,
      contractAddressHouse,
    );

    const targets = [
      ...Array(ids.length).fill(contractAddressHouse),
      ...Array(ids.length).fill(contractAddressHouse),
    ];

    const data = [
      ...ids.map((id) => contractHouse.methods.tokenDetails(id).encodeABI()),
      ...ids.map((id) => contractHouse.methods.ownerOf(id).encodeABI()),
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

    return houses.map((item, index) => ({
      house: decodeHouse(item as number),
      owner: wallets[index] as string | null,
    }));
  } catch (e) {
    if (isErrorRPC(e)) {
      return getHousesWithOwnerFromIdsFn(ids, network);
    }

    throw e;
  }
}
