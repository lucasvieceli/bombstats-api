import { WalletNetwork } from '@/database/models/Wallet';
import { chunkArray } from '@/utils';
import { ABI_HERO } from '@/utils/web3/ABI/hero-abi';
import { ABI_STAKE } from '@/utils/web3/ABI/stake-abi';
import { getMultiCalls } from '@/utils/web3/multi-calls';
import {
  getContractMultiCallBsc,
  getContractMultiCallPolygon,
  getRpcWeb3,
  isErrorRPC,
} from '@/utils/web3/web3';

export interface IHero {
  id: number;
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
    id: heroId || decodeIdHero(details),
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

  return id;
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

export const HERO_SKIN_MAP_IMAGE: Record<number, Record<number, string>> = {
  1: {
    1: 'https://media.discordapp.net/attachments/1235960737202045071/1242805383890997308/frog_blue_icon.png?ex=664f2c35&is=664ddab5&hm=6fc26c6614a438799211a4a88750ee0c0173edb8a55c0678baf365abfda5da19&=&format=webp&quality=lossless&width=256&height=268',
    2: 'https://media.discordapp.net/attachments/1235960737202045071/1242805467965689896/frog_green_icon.png?ex=664f2c49&is=664ddac9&hm=31915f615569bcec61cae04461bc267fc23a6cfa169683370eeb7f66921dfcf4&=&format=webp&quality=lossless&width=256&height=268',
    4: 'https://media.discordapp.net/attachments/1235960737202045071/1242805538023280640/frog_purple_icon.png?ex=664f2c5a&is=664ddada&hm=9374d2fff6b2c44063d68ee360603858eb7173981753c53953f9bd62cede17b1&=&format=webp&quality=lossless&width=256&height=268',
    5: 'https://media.discordapp.net/attachments/1235960737202045071/1242805605308305409/frog_yellow_icon.png?ex=664f2c6a&is=664ddaea&hm=5442d4eb430d62e6a75805752c27939aac6c09c665698673ab8ec4b1ea8aad8f&=&format=webp&quality=lossless&width=256&height=268',
    6: 'https://media.discordapp.net/attachments/1235960737202045071/1242805684849086514/frog_red_icon.png?ex=664f2c7d&is=664ddafd&hm=a67508492488c25b01b88c6bb2c2e73619665c7ef2aa91b2207f25968571417f&=&format=webp&quality=lossless&width=256&height=268',
  },
  2: {
    1: 'https://media.discordapp.net/attachments/1235960737202045071/1242804702274392144/knight_blue_icon.png?ex=664f2b93&is=664dda13&hm=b41cbdc96e94e49d69409247e304e3a42f82a26c2f80888e0b4828b9f2e1de0f&=&format=webp&quality=lossless&width=256&height=400',
    2: 'https://media.discordapp.net/attachments/1235960737202045071/1242804801901690920/knight_green_icon.png?ex=664f2baa&is=664dda2a&hm=8651c5ab85994f748fefb1920a8ea68d430b8bc7802a2e2f51f3e1bf83367d82&=&format=webp&quality=lossless&width=256&height=400',
    3: 'https://media.discordapp.net/attachments/1235960737202045071/1242804892347662456/knight_white_icon.png?ex=664f2bc0&is=664dda40&hm=b382b418d7177ebbf3d53010ce77bfd0571ad20da770085bff3231399de8569c&=&format=webp&quality=lossless&width=256&height=400',
    4: 'https://media.discordapp.net/attachments/1235960737202045071/1242804892347662456/knight_white_icon.png?ex=664f2bc0&is=664dda40&hm=b382b418d7177ebbf3d53010ce77bfd0571ad20da770085bff3231399de8569c&=&format=webp&quality=lossless&width=256&height=400',
    5: 'https://media.discordapp.net/attachments/1235960737202045071/1242805038171295765/knight_yellow_icon.png?ex=664f2be3&is=664dda63&hm=7091b76761059845f5b7940f5910bddaedc27c94b698dc89f65f03f5909bca5f&=&format=webp&quality=lossless&width=256&height=400',
    6: 'https://media.discordapp.net/attachments/1235960737202045071/1242805136972189846/knight_red_icon.png?ex=664f2bfa&is=664dda7a&hm=ced030301609b486f555d54109a99e635f2892dc4eac49bfca86950b8e713c57&=&format=webp&quality=lossless&width=256&height=400',
  },
  3: {
    1: 'https://media.discordapp.net/attachments/1235960737202045071/1242803961833197610/man_blue_icon_scaled_12x_pngcrushed.png?ex=664f2ae2&is=664dd962&hm=c63f3c3b4223d81d6b9345357e9752153dd0e8fbb887f247b555b0b9b3889244&=&format=webp&quality=lossless&width=480&height=576',
    2: 'https://media.discordapp.net/attachments/1235960737202045071/1242804103973965844/man_green_icon.png?ex=664f2b04&is=664dd984&hm=dddb8bd302f7b560ab89722de39e60ca93ab101cd61a6a38b9590bf332f3deac&=&format=webp&quality=lossless&width=256&height=308',
    3: 'https://media.discordapp.net/attachments/1235960737202045071/1242804215693185084/man_white_icon.png?ex=664f2b1f&is=664dd99f&hm=295c980435af0a800e7c2856f3e6c56f394cdf3eb4da7d72804d8201f4b55171&=&format=webp&quality=lossless&width=256&height=308',
    4: 'https://media.discordapp.net/attachments/1235960737202045071/1242804215693185084/man_white_icon.png?ex=664f2b1f&is=664dd99f&hm=295c980435af0a800e7c2856f3e6c56f394cdf3eb4da7d72804d8201f4b55171&=&format=webp&quality=lossless&width=256&height=308',
    5: 'https://media.discordapp.net/attachments/1235960737202045071/1242804303186362449/man_yellow_icon.png?ex=664f2b34&is=664dd9b4&hm=a3d63c5ec7aff5751528268a8b6e5b5689c93e31784ee617e37aecc8fab844d6&=&format=webp&quality=lossless&width=256&height=308',
    6: 'https://media.discordapp.net/attachments/1235960737202045071/1242804504680992788/man_red_icon.png?ex=664f2b64&is=664dd9e4&hm=a6fa31d871ac13a0a88fbef55844bdf69bb7362d4d1a083c025a828120dd8a74&=&format=webp&quality=lossless&width=138&height=170',
  },
  4: {
    1: 'https://media.discordapp.net/attachments/1235960737202045071/1242802559547080846/vampire_blue_icon.png?ex=664f2994&is=664dd814&hm=d9d96fc92fc6212648a0074c17216815eba25eb3834c93e3aeebd3b8b5d10ebe&=&format=webp&quality=lossless&width=256&height=368',
    2: 'https://media.discordapp.net/attachments/1235960737202045071/1242802689293942844/vampire_green_icon.png?ex=664f29b3&is=664dd833&hm=dcbf7958c31f693dc1ab6d352bede821960aeb807ddd4b62a20c437e31ee0446&=&format=webp&quality=lossless&width=256&height=368',
    4: 'https://media.discordapp.net/attachments/1235960737202045071/1242802764292034611/vampire_purple_icon.png?ex=664f29c5&is=664dd845&hm=d9243e21a9e6f14734c91306d729efa02e14a12bad642572fe67904d122df3c4&=&format=webp&quality=lossless&width=256&height=368',
    3: 'https://media.discordapp.net/attachments/1235960737202045071/1242803012502687815/vampire_red_icon.png?ex=664f2a00&is=664dd880&hm=37279b03772381627701e8c9701509f38d6d668c792eda8e56954ce0132d4120&=&format=webp&quality=lossless&width=256&height=368',
    5: 'https://media.discordapp.net/attachments/1235960737202045071/1242802886505664593/vampire_yellow_icon.png?ex=664f29e2&is=664dd862&hm=919efbedacb34ba9a5ea3fcd950dcb3bc3bacd2aea17a5396bba09990f23d081&=&format=webp&quality=lossless&width=256&height=368',
    6: 'https://media.discordapp.net/attachments/1235960737202045071/1242803012502687815/vampire_red_icon.png?ex=664f2a00&is=664dd880&hm=37279b03772381627701e8c9701509f38d6d668c792eda8e56954ce0132d4120&=&format=webp&quality=lossless&width=256&height=368',
  },
  5: {
    1: 'https://media.discordapp.net/attachments/1235960737202045071/1242800881565696051/witch_blue_icon.png?ex=664f2804&is=664dd684&hm=353ac868244ffb6d2fabe39fcc34a59a78594fe661ced37bb3990ffe6647bc2c&=&format=webp&quality=lossless&width=256&height=356',
    2: 'https://media.discordapp.net/attachments/1235960737202045071/1242801267542327367/witch_green_icon.png?ex=664f2860&is=664dd6e0&hm=cf339d34f4522fbb391db5cd048044116c6f53d063b90bcb515d7d8632a289a6&=&format=webp&quality=lossless&width=256&height=356',
    4: 'https://media.discordapp.net/attachments/1235960737202045071/1242801769986261022/witch_purple_icon.png?ex=664f28d8&is=664dd758&hm=97ae09301351482f05825be2f353e6306f2c7744c5048d28dbd0b7d07b2fceb2&=&format=webp&quality=lossless&width=256&height=356',
    5: 'https://media.discordapp.net/attachments/1235960737202045071/1242801899409768518/witch_yellow_icon.png?ex=664f28f6&is=664dd776&hm=40208a9f7acb24417db4c25c0d6679da80fa43f9d72c531899714f291321bf3c&=&format=webp&quality=lossless&width=256&height=356',
    6: 'https://media.discordapp.net/attachments/1235960737202045071/1242802242088734830/witch_red_icon.png?ex=664f2948&is=664dd7c8&hm=343afb998e3ad8e269a92033735571ead7348c2788111db4d693716adf22539a&=&format=webp&quality=lossless&width=256&height=356',
  },
  6: {
    1: 'https://cdn.discordapp.com/attachments/1236786235893088316/1242421881659985992/doge_icon.webp?ex=664dc70b&is=664c758b&hm=ea9f68a973bee6e5635c3d11030f569be65f94e5cbe7ca0edef29a3c8b387e4e&=&format=webp&width=256&height=312',
    2: 'https://cdn.discordapp.com/attachments/1236786235893088316/1242421881659985992/doge_icon.webp?ex=664dc70b&is=664c758b&hm=ea9f68a973bee6e5635c3d11030f569be65f94e5cbe7ca0edef29a3c8b387e4e&=&format=webp&width=256&height=312',
    3: 'https://cdn.discordapp.com/attachments/1236786235893088316/1242421881659985992/doge_icon.webp?ex=664dc70b&is=664c758b&hm=ea9f68a973bee6e5635c3d11030f569be65f94e5cbe7ca0edef29a3c8b387e4e&=&format=webp&width=256&height=312',
    4: 'https://cdn.discordapp.com/attachments/1236786235893088316/1242421881659985992/doge_icon.webp?ex=664dc70b&is=664c758b&hm=ea9f68a973bee6e5635c3d11030f569be65f94e5cbe7ca0edef29a3c8b387e4e&=&format=webp&width=256&height=312',
    5: 'https://cdn.discordapp.com/attachments/1236786235893088316/1242421881659985992/doge_icon.webp?ex=664dc70b&is=664c758b&hm=ea9f68a973bee6e5635c3d11030f569be65f94e5cbe7ca0edef29a3c8b387e4e&=&format=webp&width=256&height=312',
  },
  7: {
    1: 'https://media.discordapp.net/attachments/1235960737202045071/1242799850161180713/pepe_icon.png?ex=664f270e&is=664dd58e&hm=a8121df0ce336858a2fec3a1059e7c2440eca0596eb615e7d1fceb00ba6e7207&=&format=webp&quality=lossless&width=256&height=358',
    2: 'https://media.discordapp.net/attachments/1235960737202045071/1242799850161180713/pepe_icon.png?ex=664f270e&is=664dd58e&hm=a8121df0ce336858a2fec3a1059e7c2440eca0596eb615e7d1fceb00ba6e7207&=&format=webp&quality=lossless&width=256&height=358',
    3: 'https://media.discordapp.net/attachments/1235960737202045071/1242799850161180713/pepe_icon.png?ex=664f270e&is=664dd58e&hm=a8121df0ce336858a2fec3a1059e7c2440eca0596eb615e7d1fceb00ba6e7207&=&format=webp&quality=lossless&width=256&height=358',
    4: 'https://media.discordapp.net/attachments/1235960737202045071/1242799850161180713/pepe_icon.png?ex=664f270e&is=664dd58e&hm=a8121df0ce336858a2fec3a1059e7c2440eca0596eb615e7d1fceb00ba6e7207&=&format=webp&quality=lossless&width=256&height=358',
    5: 'https://media.discordapp.net/attachments/1235960737202045071/1242799850161180713/pepe_icon.png?ex=664f270e&is=664dd58e&hm=a8121df0ce336858a2fec3a1059e7c2440eca0596eb615e7d1fceb00ba6e7207&=&format=webp&quality=lossless&width=256&height=358',
  },
  8: {
    1: 'https://cdn.discordapp.com/attachments/1235960737202045071/1242423184225992734/ninja_icon.webp?ex=664dc842&is=664c76c2&hm=956669642f99571aa3f33502e59a812667134119fd772e6c52c8bec2ac8f725b&',
    2: 'https://cdn.discordapp.com/attachments/1235960737202045071/1242423184225992734/ninja_icon.webp?ex=664dc842&is=664c76c2&hm=956669642f99571aa3f33502e59a812667134119fd772e6c52c8bec2ac8f725b&',
    3: 'https://cdn.discordapp.com/attachments/1235960737202045071/1242423184225992734/ninja_icon.webp?ex=664dc842&is=664c76c2&hm=956669642f99571aa3f33502e59a812667134119fd772e6c52c8bec2ac8f725b&',
    4: 'https://cdn.discordapp.com/attachments/1235960737202045071/1242423184225992734/ninja_icon.webp?ex=664dc842&is=664c76c2&hm=956669642f99571aa3f33502e59a812667134119fd772e6c52c8bec2ac8f725b&',
    5: 'https://cdn.discordapp.com/attachments/1235960737202045071/1242423184225992734/ninja_icon.webp?ex=664dc842&is=664c76c2&hm=956669642f99571aa3f33502e59a812667134119fd772e6c52c8bec2ac8f725b&',
  },
  9: {
    1: 'https://media.discordapp.net/attachments/1235960737202045071/1242425742785249361/image.png?ex=664dcaa4&is=664c7924&hm=f4a2d97d080a6f469baac71f2eb67d83972aa673aefad9d15943f419bc2741e5&=&format=webp&quality=lossless',
    2: 'https://media.discordapp.net/attachments/1235960737202045071/1242425742785249361/image.png?ex=664dcaa4&is=664c7924&hm=f4a2d97d080a6f469baac71f2eb67d83972aa673aefad9d15943f419bc2741e5&=&format=webp&quality=lossless',
    3: 'https://media.discordapp.net/attachments/1235960737202045071/1242425742785249361/image.png?ex=664dcaa4&is=664c7924&hm=f4a2d97d080a6f469baac71f2eb67d83972aa673aefad9d15943f419bc2741e5&=&format=webp&quality=lossless',
    4: 'https://media.discordapp.net/attachments/1235960737202045071/1242425742785249361/image.png?ex=664dcaa4&is=664c7924&hm=f4a2d97d080a6f469baac71f2eb67d83972aa673aefad9d15943f419bc2741e5&=&format=webp&quality=lossless',
    5: 'https://media.discordapp.net/attachments/1235960737202045071/1242425742785249361/image.png?ex=664dcaa4&is=664c7924&hm=f4a2d97d080a6f469baac71f2eb67d83972aa673aefad9d15943f419bc2741e5&=&format=webp&quality=lossless',
  },
  10: {
    1: 'https://cdn.discordapp.com/attachments/1236786235893088316/1242421437441114123/rabbit_icon.webp?ex=664dc6a1&is=664c7521&hm=e33646a639c6646f7fa72dcb9c3101aa7e746b53f4888c718f7330d4bdac55de&=&format=webp&width=256&height=312',
    2: 'https://cdn.discordapp.com/attachments/1236786235893088316/1242421437441114123/rabbit_icon.webp?ex=664dc6a1&is=664c7521&hm=e33646a639c6646f7fa72dcb9c3101aa7e746b53f4888c718f7330d4bdac55de&=&format=webp&width=256&height=312',
    3: 'https://cdn.discordapp.com/attachments/1236786235893088316/1242421437441114123/rabbit_icon.webp?ex=664dc6a1&is=664c7521&hm=e33646a639c6646f7fa72dcb9c3101aa7e746b53f4888c718f7330d4bdac55de&=&format=webp&width=256&height=312',
    4: 'https://cdn.discordapp.com/attachments/1236786235893088316/1242421437441114123/rabbit_icon.webp?ex=664dc6a1&is=664c7521&hm=e33646a639c6646f7fa72dcb9c3101aa7e746b53f4888c718f7330d4bdac55de&=&format=webp&width=256&height=312',
    5: 'https://cdn.discordapp.com/attachments/1236786235893088316/1242421437441114123/rabbit_icon.webp?ex=664dc6a1&is=664c7521&hm=e33646a639c6646f7fa72dcb9c3101aa7e746b53f4888c718f7330d4bdac55de&=&format=webp&width=256&height=312',
  },
  14: {
    1: 'https://media.discordapp.net/attachments/1235960737202045071/1242424819220217928/image.png?ex=664dc9c8&is=664c7848&hm=7ef84dac6980978ed6c2396cc750d32c16864ee6286ee39a4ddac2e9f27b3f59&=&format=webp&quality=lossless',
    2: 'https://media.discordapp.net/attachments/1235960737202045071/1242424819220217928/image.png?ex=664dc9c8&is=664c7848&hm=7ef84dac6980978ed6c2396cc750d32c16864ee6286ee39a4ddac2e9f27b3f59&=&format=webp&quality=lossless',
    3: 'https://media.discordapp.net/attachments/1235960737202045071/1242424819220217928/image.png?ex=664dc9c8&is=664c7848&hm=7ef84dac6980978ed6c2396cc750d32c16864ee6286ee39a4ddac2e9f27b3f59&=&format=webp&quality=lossless',
    4: 'https://media.discordapp.net/attachments/1235960737202045071/1242424819220217928/image.png?ex=664dc9c8&is=664c7848&hm=7ef84dac6980978ed6c2396cc750d32c16864ee6286ee39a4ddac2e9f27b3f59&=&format=webp&quality=lossless',
    5: 'https://media.discordapp.net/attachments/1235960737202045071/1242424819220217928/image.png?ex=664dc9c8&is=664c7848&hm=7ef84dac6980978ed6c2396cc750d32c16864ee6286ee39a4ddac2e9f27b3f59&=&format=webp&quality=lossless',
  },
  15: {
    1: 'https://media.discordapp.net/attachments/1236786235893088316/1242422132323913748/tiger_icon.webp?ex=664dc747&is=664c75c7&hm=ccae86e025f02eaabf973d1e011642ab9d2a377fd61cfac0381942904f334dcc&=&format=webp&width=256&height=312',
    2: 'https://media.discordapp.net/attachments/1236786235893088316/1242422132323913748/tiger_icon.webp?ex=664dc747&is=664c75c7&hm=ccae86e025f02eaabf973d1e011642ab9d2a377fd61cfac0381942904f334dcc&=&format=webp&width=256&height=312',
    3: 'https://media.discordapp.net/attachments/1236786235893088316/1242422132323913748/tiger_icon.webp?ex=664dc747&is=664c75c7&hm=ccae86e025f02eaabf973d1e011642ab9d2a377fd61cfac0381942904f334dcc&=&format=webp&width=256&height=312',
    4: 'https://media.discordapp.net/attachments/1236786235893088316/1242422132323913748/tiger_icon.webp?ex=664dc747&is=664c75c7&hm=ccae86e025f02eaabf973d1e011642ab9d2a377fd61cfac0381942904f334dcc&=&format=webp&width=256&height=312',
    5: 'https://media.discordapp.net/attachments/1236786235893088316/1242422132323913748/tiger_icon.webp?ex=664dc747&is=664c75c7&hm=ccae86e025f02eaabf973d1e011642ab9d2a377fd61cfac0381942904f334dcc&=&format=webp&width=256&height=312',
  },
  16: {
    1: 'https://media.discordapp.net/attachments/1235960737202045071/1242424426696282234/image.png?ex=664dc96a&is=664c77ea&hm=4d0065963bf1c5cb0f80f68ef0748418bb4b07dfc7a6c0ec27840f2537a61c6b&=&format=webp&quality=lossless',
    2: 'https://media.discordapp.net/attachments/1235960737202045071/1242424426696282234/image.png?ex=664dc96a&is=664c77ea&hm=4d0065963bf1c5cb0f80f68ef0748418bb4b07dfc7a6c0ec27840f2537a61c6b&=&format=webp&quality=lossless',
    3: 'https://media.discordapp.net/attachments/1235960737202045071/1242424426696282234/image.png?ex=664dc96a&is=664c77ea&hm=4d0065963bf1c5cb0f80f68ef0748418bb4b07dfc7a6c0ec27840f2537a61c6b&=&format=webp&quality=lossless',
    4: 'https://media.discordapp.net/attachments/1235960737202045071/1242424426696282234/image.png?ex=664dc96a&is=664c77ea&hm=4d0065963bf1c5cb0f80f68ef0748418bb4b07dfc7a6c0ec27840f2537a61c6b&=&format=webp&quality=lossless',
    5: 'https://media.discordapp.net/attachments/1235960737202045071/1242424426696282234/image.png?ex=664dc96a&is=664c77ea&hm=4d0065963bf1c5cb0f80f68ef0748418bb4b07dfc7a6c0ec27840f2537a61c6b&=&format=webp&quality=lossless',
  },
};

export function parseHeroSkinImage(skin: number, variant: number) {
  return skin in HERO_SKIN_MAP_IMAGE && variant in HERO_SKIN_MAP_IMAGE[skin]
    ? HERO_SKIN_MAP_IMAGE[skin][variant]
    : 'https://bcrypt.com.br/_next/image?url=%2Fbhero%2Fman_white_icon.png&w=128&q=75';
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
}

export async function getHeroesWithStakeOwnerFromIds(
  ids: number[],
  network: WalletNetwork,
) {
  const chuncks = chunkArray<number>(ids, 300);

  let resultHeroes: IHeroStakeOwner[] = [];
  for (const ids of chuncks) {
    const newHeroes = await getHeroesWithStakeOwnerFromIdsFn(ids, network);
    resultHeroes = [...resultHeroes, ...newHeroes];
  }

  return resultHeroes;
}

async function getHeroesWithStakeOwnerFromIdsFn(
  ids: number[],
  network: WalletNetwork,
): Promise<IHeroStakeOwner[]> {
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
      ...Array(ids.length).fill(contractAddressHero),
      ...Array(ids.length).fill(contractAddressStake),
    ];

    const data = [
      ...ids.map((id) => contractHero.methods.tokenDetails(id).encodeABI()),
      ...ids.map((id) => contractHero.methods.ownerOf(id).encodeABI()),
      ...ids.map((id) =>
        contractStake.methods.getCoinBalancesByHeroId(id).encodeABI(),
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
      .slice(ids.length * 2)
      .map((r: any) => fnInstance.eth.abi.decodeParameter('uint256', r));

    const divisor = 10n ** 18n;

    return await Promise.all(
      heroes.map(async (item, index) => ({
        hero: await decodeHero(
          item,
          Number((stakes[index] as any) / divisor),
          ids[index],
        ),
        owner: wallets[index] as string | null,
        stake: Number((stakes[index] as any) / divisor),
      })),
    );
  } catch (e) {
    if (isErrorRPC(e)) {
      return getHeroesWithStakeOwnerFromIdsFn(ids, network);
    }

    throw e;
  }
}
