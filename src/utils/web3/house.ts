export interface IHouse {
  id: number;
  index: number;
  rarity: number;
  recovery: number;
  capacity: number;
  blockNumber: number;
  name: string;
}

export async function getHousesFromGenIds(genIds: number[]): Promise<IHouse[]> {
  return genIds.map((genId) => decodeHouse(genId));
}

function decodeHouse(details: number): IHouse {
  const detailsBigInt = BigInt(details);
  const rarity = decodeRarity(detailsBigInt);
  const result = {
    id: decodeId(detailsBigInt),
    index: decodeIndex(detailsBigInt),
    rarity,
    recovery: decodeRecovery(detailsBigInt),
    capacity: decodeCapacity(detailsBigInt),
    blockNumber: decodeBlockNumber(detailsBigInt),
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

function decodeId(detailsBigInt: bigint) {
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
