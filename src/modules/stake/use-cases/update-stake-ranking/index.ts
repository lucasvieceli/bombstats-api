import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { HouseRepository } from '@/database/repositories/house-repository';
import { StakeRankingHeroRepository } from '@/database/repositories/stake-ranking-hero';
import { StakeRankingWalletRepository } from '@/database/repositories/stake-ranking-wallet';
import { StakeRankingWalletGlobalRepository } from '@/database/repositories/stake-ranking-wallet-global';
import { StakeRepository } from '@/database/repositories/stake-repository';
import { StakeSenRankingWalletRepository } from '@/database/repositories/stake-sen-ranking-wallet';
import { TotalsRepository } from '@/database/repositories/totals-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { HeroUpdateQueue } from '@/modules/hero/processors/hero-update';
import { HouseUpdateQueue } from '@/modules/house/processors/house-update';
import { MarketService } from '@/services/market';
import { chunkArray, executePromisesBlock } from '@/utils';
import { ABI_STAKE } from '@/utils/web3/ABI/stake-abi';
import { IHero } from '@/utils/web3/hero';
import { NAMES_TOKENS_IDS_MAP } from '@/utils/web3/reward';
import { decodeInputTransaction } from '@/utils/web3/web3';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { QueueEvents } from 'bullmq';
import { In, IsNull, MoreThanOrEqual, Not } from 'typeorm';

interface Transaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
  heroId?: string;
  stake: number;
  hero?: IHero;
  token?: string;
}

const DEPOSIT_METHOD = [
  'depositCoinIntoHeroId(uint256 id,uint256 amount)',
  'depositV2(address _masterWombat,uint256 _pid,uint256 _amount)',
];
const WITHDRAW_METHOD = [
  'withdrawCoinFromHeroId(uint256 id,uint256 amount)',
  'withdrawV2(address _masterWombat,uint256 _pid,uint256 _amount)',
];

interface IUpdateStakeRanking {
  network: WalletNetwork;
}

@Injectable()
export class UpdateStakeRanking {
  constructor(
    private stakeRepository: StakeRepository,
    private stakeRankingHeroRepository: StakeRankingHeroRepository,
    private stakeRankingWalletRepository: StakeRankingWalletRepository,
    private stakeSenRankingWalletRepository: StakeSenRankingWalletRepository,
    private totalsRepository: TotalsRepository,
    private marketService: MarketService,
    private heroRepository: HeroRepository,
    private houseRepository: HouseRepository,
    private stakeRankingWalletGlobalRepository: StakeRankingWalletGlobalRepository,
    private walletRepository: WalletRepository,

    @InjectQueue('house-update') private readonly houseUpdate: HouseUpdateQueue,
    @InjectQueue('hero-update') private readonly heroUpdate: HeroUpdateQueue,
  ) {}
  async execute({ network }: IUpdateStakeRanking) {
    let transactions;
    const defaultBlock = 0;
    const lastBlockNumber =
      (
        await this.stakeRepository.findOne({
          where: { network },
          order: { blockNumber: 'DESC' },
        })
      )?.blockNumber ?? defaultBlock;

    Logger.debug('buscando transacoes ' + network, 'UpdateStakeRanking');
    if (network == WalletNetwork.BSC) {
      transactions = await this.getTransactionsBSC(lastBlockNumber);
    } else {
      transactions = await this.getTransactionsPolygon(lastBlockNumber);
    }
    Logger.debug(`transactions ${transactions.length}`, 'UpdateStakeRanking');
    const deposited = transactions
      .filter((transaction) =>
        DEPOSIT_METHOD.includes(transaction.functionName),
      )
      .map((v) => this.parseHeroAndStake(v, network));

    const withdraws = transactions
      .filter((transaction) =>
        WITHDRAW_METHOD.includes(transaction.functionName),
      )
      .map((v) => this.parseHeroAndStake(v, network));

    const newHeroes = await this.getHeroes(
      [...deposited, ...withdraws],
      network,
    );
    Logger.debug(`newHeroes ${newHeroes.length}`, 'UpdateStakeRanking');

    Logger.debug(`deposited ${deposited.length}`, 'UpdateStakeRanking');
    await this.insertDeposit(deposited, network, newHeroes);
    Logger.debug(`withdraws ${withdraws.length}`, 'UpdateStakeRanking');

    await this.withdrawStake(withdraws, network, newHeroes);
    Logger.debug(`atualizando heroes`, 'UpdateStakeRanking');

    const allHeroes = await this.updateHeroes(network);
    Logger.debug(`allHeroes ${allHeroes.length}`, 'UpdateStakeRanking');

    await this.updateStakesDb(network, allHeroes);

    const amount = allHeroes.reduce((acc, item) => acc + item.stake, 0);
    const stakeSen = allHeroes.reduce((acc, item) => acc + item.stakeSen, 0);
    const qtyHeroesStake = allHeroes.filter((item) => item.stake > 0).length;
    const qtyHeroesStakeSen = allHeroes.filter(
      (item) => item.stakeSen > 0,
    ).length;

    Logger.debug(`criando wallets heroes`, 'UpdateStakeRanking');
    await this.createWallets([...deposited, ...withdraws], network);
    Logger.debug(`atualizando ranking wallet`, 'UpdateStakeRanking');
    await this.insertRankingWallet(allHeroes, network);
    await this.insertRankingSenWallet(allHeroes, network);
    Logger.debug(`atualizando ranking heroes`, 'UpdateStakeRanking');
    await this.insertRankingRarityHero(allHeroes, network, 0);
    await this.insertRankingRarityHero(allHeroes, network, 1);
    await this.insertRankingRarityHero(allHeroes, network, 2);
    await this.insertRankingRarityHero(allHeroes, network, 3);
    await this.insertRankingRarityHero(allHeroes, network, 4);
    await this.insertRankingRarityHero(allHeroes, network, 5);
    Logger.debug(`atualizando totais`, 'UpdateStakeRanking');
    await this.totalsRepository.insertOrUpdate(
      'stake-amount',
      amount.toString(),
      network,
    );
    await this.totalsRepository.insertOrUpdate(
      'stake-sen-amount',
      stakeSen.toString(),
      network,
    );
    await this.totalsRepository.insertOrUpdate(
      'stake-heroes',
      qtyHeroesStake.toString(),
      network,
    );
    await this.totalsRepository.insertOrUpdate(
      'stake-sen-heroes',
      qtyHeroesStakeSen.toString(),
      network,
    );
    await this.totalsRepository.insertOrUpdate(
      'stake-average',
      (amount / qtyHeroesStake).toString(),
      network,
    );
    await this.totalsRepository.insertOrUpdate(
      'stake-sen-average',
      (stakeSen / qtyHeroesStakeSen).toString(),
      network,
    );
    Logger.debug(
      `Terminou UpdateStakeRanking ${network}`,
      'UpdateStakeRanking',
    );
  }

  async createRankingGlobal() {
    Logger.debug('createRankingGlobal wallet', 'UpdateStakeRanking');
    await this.stakeRankingWalletGlobalRepository.createRankingWalletGlobal();

    Logger.debug('createRankingGlobal Hero', 'UpdateStakeRanking');
    await this.stakeRankingHeroRepository.createRankingGlobal(0);
    await this.stakeRankingHeroRepository.createRankingGlobal(1);
    await this.stakeRankingHeroRepository.createRankingGlobal(2);
    await this.stakeRankingHeroRepository.createRankingGlobal(3);
    await this.stakeRankingHeroRepository.createRankingGlobal(4);
    await this.stakeRankingHeroRepository.createRankingGlobal(5);
  }

  async updateStakesDb(network: WalletNetwork, allHeroes: Hero[]) {
    const stakes = await this.stakeRepository.find({
      where: {
        network,
        rarity: Not(IsNull()),
      },
    });

    const stakesToUpdate = stakes
      .map((stake) => {
        const hero = allHeroes.find((hero) => hero.id == stake.heroId);
        if (!hero || (hero && !hero.burned)) {
          return null;
        }

        return {
          ...stake,
          rarity: null,
        };
      })
      .filter((item) => item !== null);

    Logger.debug(
      `stakes to update ${stakesToUpdate.length}`,
      'UpdateStakeRanking',
    );

    if (stakesToUpdate.length > 0) {
      const chunks = chunkArray(stakesToUpdate, 1000);
      for (const chunk of chunks) {
        await this.stakeRepository.save(chunk);
      }
    }
  }

  async insertRankingRarityHero(
    heroes: Hero[],
    network: WalletNetwork,
    rarity: number,
  ) {
    await this.stakeRankingHeroRepository.delete({
      network,
      rarity,
    });

    const heroesGroupedByRarity = heroes
      .filter(
        (hero) => !hero.burned && hero.rarityIndex == rarity && hero.stake > 0,
      )
      .reduce(
        (acc, hero) => {
          if (!acc[hero.id]) {
            acc[hero.id] = {
              stake: 0,
              stakeSen: 0,
              positionSen: 0,
              positionBcoin: 0,
              owner: '',
              heroId: hero.id.toString(),
            };
          }
          acc[hero.id]['stake'] += hero.stake;
          acc[hero.id]['stakeSen'] += hero.stakeSen;
          acc[hero.id]['owner'] = hero.wallet;
          return acc;
        },
        {} as Record<
          number,
          {
            stake: number;
            stakeSen: number;
            positionBcoin: number;
            positionSen: number;
            owner: string;
            heroId: string;
          }
        >,
      );
    const heroesGroupedByRaritySortedByStakeDescArray = Object.values(
      heroesGroupedByRarity,
    )
      .sort((a, b) => b.stake - a.stake)
      .map((item, index) => ({
        ...item,
        positionBcoin: index + 1,
      }))
      .sort((a, b) => b.stakeSen - a.stakeSen)
      .map((item, index) => {
        return {
          ...item,
          positionSen: index + 1,
        };
      });

    const chunks = chunkArray(
      heroesGroupedByRaritySortedByStakeDescArray.map((hero) => {
        return {
          network,
          heroId: hero.heroId,
          stake: hero.stake,
          stakeSen: hero.stakeSen,
          wallet: hero.owner,
          rarity,
          positionBcoin: hero.positionBcoin,
          positionSen: hero.positionSen,
        };
      }),
      1000,
    );

    for (const chunk of chunks) {
      await this.stakeRankingHeroRepository.save(chunk);
    }
  }

  async insertRankingWallet(heroes: Hero[], network: WalletNetwork) {
    await this.stakeRankingWalletRepository.delete({
      network,
    });

    const heroesGroupedByWallet = heroes
      .filter((wallet) => wallet.wallet)
      .reduce(
        (acc, hero) => {
          if (!acc[hero.wallet]) {
            acc[hero.wallet] = {
              stake: 0,
              stakeSen: 0,
            };
          }
          acc[hero.wallet].stake += hero.stake;
          acc[hero.wallet].stakeSen += hero.stakeSen;
          return acc;
        },
        {} as Record<string, { stake: number; stakeSen: number }>,
      );
    const heroesGroupedByWalletSortedByStakeDescArray = Object.entries(
      heroesGroupedByWallet,
    )
      .sort((a, b) => b[1].stake - a[1].stake)
      .filter(([wallet, item]) => wallet && item.stake > 0);

    const chunks = chunkArray(
      heroesGroupedByWalletSortedByStakeDescArray.map(
        ([wallet, stake], index) => {
          return {
            network,
            wallet,
            stake: stake.stake,
            stakeSen: stake.stakeSen,
            position: index + 1,
          };
        },
      ),
      1000,
    );

    for (const chunk of chunks) {
      await this.stakeRankingWalletRepository.save(chunk);
    }
  }
  async insertRankingSenWallet(heroes: Hero[], network: WalletNetwork) {
    await this.stakeSenRankingWalletRepository.delete({
      network,
    });

    const heroesGroupedByWallet = heroes
      .filter((wallet) => wallet.wallet)
      .reduce(
        (acc, hero) => {
          if (!acc[hero.wallet]) {
            acc[hero.wallet] = {
              stake: 0,
              stakeSen: 0,
            };
          }
          acc[hero.wallet].stakeSen += hero.stakeSen;
          acc[hero.wallet].stake += hero.stake;
          return acc;
        },
        {} as Record<string, { stake: number; stakeSen: number }>,
      );
    const heroesGroupedByWalletSortedByStakeDescArray = Object.entries(
      heroesGroupedByWallet,
    )
      .sort((a, b) => b[1].stakeSen - a[1].stakeSen)
      .filter(([wallet, stake]) => wallet && stake.stakeSen > 0);

    const chunks = chunkArray(
      heroesGroupedByWalletSortedByStakeDescArray.map(
        ([wallet, item], index) => {
          return {
            network,
            wallet,
            stakeSen: item.stakeSen,
            stake: item.stake,
            position: index + 1,
          };
        },
      ),
      1000,
    );

    for (const chunk of chunks) {
      await this.stakeSenRankingWalletRepository.save(chunk);
    }
  }

  async getHeroes(allTransactions: Transaction[], network: WalletNetwork) {
    const ids = Array.from(new Set(allTransactions.map((item) => item.heroId)));

    const job = await this.heroUpdate.add('hero-update', {
      heroes: ids,
      network,
      log: true,
      returnValues: true,
    });
    const queueEvents = new QueueEvents('hero-update');
    return await job.waitUntilFinished(queueEvents);
  }

  async createWallets(allTransactions: Transaction[], network: WalletNetwork) {
    //remove duplicates
    const walletsIds = Array.from(
      new Set(
        allTransactions
          .map((item) => item.from?.toLowerCase())
          .filter((walletId): walletId is string => Boolean(walletId)),
      ),
    );
    const wallets = walletsIds.map((walletId) => ({
      walletId,
      network,
    }));

    const chunks = chunkArray(wallets, 1000);

    for (const chunk of chunks) {
      await this.walletRepository.upsert(chunk, ['walletId', 'network']);
    }
  }

  async updateHeroes(network: WalletNetwork) {
    const heroIds = await this.stakeRepository.getHeroes(network);
    Logger.debug(`heroIds ${heroIds.length}`, 'UpdateStakeRanking');
    const heroesMarket = await this.marketService.getTokenIds(
      'heroes',
      network,
    );
    Logger.debug(`heroesMarket ${heroesMarket.length}`, 'UpdateStakeRanking');

    const heroesMarketDb = (
      await this.heroRepository.find({
        where: { marketPrice: MoreThanOrEqual(0), network },
      })
    ).map((item) => item.id);
    Logger.debug(
      `heroesMarketDb ${heroesMarketDb.length}`,
      'UpdateStakeRanking',
    );

    if (heroesMarket.length) {
      await this.heroRepository.removeHeroesFromMarket(heroesMarket, network);
    }

    const housesMarket = await this.marketService.getTokenIds(
      'houses',
      network,
    );
    Logger.debug(`housesMarket ${housesMarket.length}`, 'UpdateStakeRanking');

    if (housesMarket.length) {
      await this.houseRepository.removeHousesFromMarket(housesMarket, network);
    }

    const housesMarketDb = (
      await this.houseRepository.find({
        where: { marketPrice: MoreThanOrEqual(0), network },
      })
    ).map((item) => item.id);
    Logger.debug(
      `housesMarketDb ${housesMarketDb.length}`,
      'UpdateStakeRanking',
    );

    await this.houseUpdate.add('house-update', {
      houses: Array.from(new Set(housesMarket.concat(housesMarketDb))),
      network,
      log: true,
    });

    //join heroes and remove duplicates
    const heroes = Array.from(
      new Set(
        heroIds
          .map((h) => h.heroId)
          .concat(heroesMarket)
          .concat(heroesMarketDb),
      ),
    );

    let returnHeroes = [];

    const chunkHeroes = chunkArray<string>(heroes, 600);

    await Promise.all(
      chunkHeroes.map(async (chunk) => {
        const heroes = await this.heroUpdate.add(
          'hero-update',
          {
            heroes: chunk,
            network,
            log: true,
            returnValues: true,
          },
          { priority: 1 },
        );
        const queueEvents = new QueueEvents('hero-update');
        const newHeroes = await heroes.waitUntilFinished(queueEvents);
        returnHeroes = [...returnHeroes, ...newHeroes];
      }),
    );
    // for (const chunk of chunkHeroes) {
    //   const heroes = await this.heroUpdate.add(
    //     'hero-update',
    //     {
    //       heroes: chunk,
    //       network,
    //       log: true,
    //       returnValues: true,
    //     },
    //     { priority: 2 },
    //   );
    //   const queueEvents = new QueueEvents('hero-update');
    //   returnHeroes = returnHeroes.concat(
    //     await heroes.waitUntilFinished(queueEvents),
    //   );
    // }

    return returnHeroes;

    // const job = await this.heroUpdate.add('hero-update', {
    //   heroes,
    //   network,
    //   log: true,
    //   returnValues: true,
    // });
    // const queueEvents = new QueueEvents('hero-update');
    // return await job.waitUntilFinished(queueEvents);
  }

  async withdrawStake(transactions: Transaction[], network, heroes: Hero[]) {
    const promisesSearchHero = chunkArray<Transaction>(transactions, 1000).map(
      (chunk) => async () => {
        const transactionHashes = chunk.map((transaction) => transaction.hash);

        const existingTransactions = await this.stakeRepository.find({
          where: {
            hash: In(transactionHashes),
          },
          select: ['hash'],
        });

        const existingHashes = new Set(
          existingTransactions.map((transaction) => transaction.hash),
        );

        const newTransactions = chunk
          .filter((transaction) => !existingHashes.has(transaction.hash))
          .map((transaction) => {
            const heroOwner = heroes.find(
              (item) => item.id.toString() == transaction.heroId.toString(),
            );
            if (!heroOwner) {
              return null;
            }
            return {
              heroId: heroOwner?.id.toString(),
              rarity: !heroOwner.burned ? Number(heroOwner?.rarityIndex) : null,
              amount: -transaction.stake,
              network,
              token: transaction.token,
              currentWallet: heroOwner.wallet,
              date: new Date(Number(transaction.timeStamp) * 1000),
              withdraw: 1,
              wallet: transaction.from.toLowerCase(),
              hash: transaction.hash,
              blockNumber: transaction.blockNumber,
            };
          })
          .filter((transaction) => transaction !== null);

        if (newTransactions.length > 0) {
          await this.stakeRepository.save(newTransactions);
        }
      },
    );

    await executePromisesBlock(
      promisesSearchHero,
      1,
      'all',
      0,
      'withdrawStake',
    );
  }

  async insertDeposit(
    deposited: Transaction[],
    network: WalletNetwork,
    heroes: Hero[],
  ) {
    const promisesSearchHero = chunkArray<Transaction>(deposited, 1000).map(
      (chunk) => async () => {
        const transactionHashes = chunk.map((transaction) => transaction.hash);

        const existingTransactions = await this.stakeRepository.find({
          where: {
            hash: In(transactionHashes),
          },
          select: ['hash'],
        });

        const existingHashes = new Set(
          existingTransactions.map((transaction) => transaction.hash),
        );

        const newTransactions = chunk
          .filter((transaction) => !existingHashes.has(transaction.hash))
          .map((transaction) => {
            const heroOwner = heroes.find(
              (item) => item.id.toString() == transaction.heroId.toString(),
            );
            if (!heroOwner) {
              return null;
            }
            return {
              heroId: heroOwner?.id.toString(),
              rarity: !heroOwner.burned ? Number(heroOwner?.rarityIndex) : null,
              amount: transaction.stake,
              currentWallet: heroOwner.wallet,
              date: new Date(Number(transaction.timeStamp) * 1000),
              network,
              token: transaction.token,
              withdraw: 0,
              wallet: transaction.from.toLowerCase(),
              hash: transaction.hash,
              blockNumber: transaction.blockNumber,
            };
          })
          .filter((transaction) => transaction !== null);

        // Salvar as novas transações em lote
        if (newTransactions.length > 0) {
          await this.stakeRepository.save(newTransactions);
        }
      },
    );

    await executePromisesBlock(
      promisesSearchHero,
      1,
      'all',
      0,
      'insertDeposit',
    );
  }

  async getTransactionsPolygon(startBlock: number | string) {
    return this.getTransactions([], {
      url: 'https://api.etherscan.io/v2/api',
      address: process.env.CONTRACT_STAKE_POLYGON,
      apiKey: process.env.ETHERSCAN_KEY!,
      startBlock,
      chainid: 137,
    });
  }

  async getTransactionsBSC(startBlock: number | string) {
    return this.getTransactions([], {
      url: 'https://api.etherscan.io/v2/api',
      address: process.env.CONTRACT_STAKE_BSC!,
      apiKey: process.env.ETHERSCAN_KEY!,
      startBlock,
      chainid: 56,
    });
  }
  async getTransactions(
    values: Transaction[] = [],
    { url, address, apiKey, startBlock = 0, chainid }: any,
  ): Promise<Transaction[]> {
    const { data } = await axios.get(url, {
      params: {
        module: 'account',
        action: 'txlist',
        address,
        startblock: startBlock,
        endblock: 9999999999,
        sort: 'asc',
        apikey: apiKey,
        page: 1,
        offset: 10000,
        chainid,
      },
    });

    if (data.result.length == 10000) {
      return this.getTransactions([...values, ...data.result], {
        url,
        address,
        apiKey,
        startBlock: data.result[9999].blockNumber,
        chainid,
      });
    }

    return [...values, ...data.result];
  }

  parseHeroAndStake(transaction: Transaction, network: WalletNetwork) {
    let stake = 0;
    let heroId = '';
    let token = '';
    //convert hex to dec
    if (
      transaction.functionName ==
        'depositCoinIntoHeroId(uint256 id,uint256 amount)' ||
      transaction.functionName ==
        'withdrawCoinFromHeroId(uint256 id,uint256 amount)'
    ) {
      heroId = parseInt(transaction.input.slice(10, 74), 16).toString();
      stake = parseInt(transaction.input.slice(74), 16) / 10 ** 18;
      token =
        network == WalletNetwork.BSC
          ? NAMES_TOKENS_IDS_MAP.BCOIN_BSC
          : NAMES_TOKENS_IDS_MAP.BCOIN_POLYGON;
    } else {
      const result = decodeInputTransaction(
        transaction.input,
        'depositV2',
        ABI_STAKE,
        null,
      );
      token = result[0].toLowerCase();
      heroId = result[1].toString();
      stake = Number(result[2]) / 10 ** 18;
    }

    return {
      ...transaction,
      heroId,
      stake,
      token,
    };
  }
}
