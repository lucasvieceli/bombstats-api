import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { StakeRankingHeroRepository } from '@/database/repositories/stake-ranking-hero';
import { StakeRankingWalletRepository } from '@/database/repositories/stake-ranking-wallet';
import { StakeRepository } from '@/database/repositories/stake-repository';
import { TotalsRepository } from '@/database/repositories/totals-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { chunkArray, executePromisesBlock } from '@/utils';
import { IHero, getHeroesWithStakeOwnerFromIds } from '@/utils/web3/hero';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { In } from 'typeorm';

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
  heroId?: number;
  stake: number;
  hero?: IHero;
}

const DEPOSIT_METHOD = 'depositCoinIntoHeroId(uint256 id,uint256 amount)';
const WITHDRAW_METHOD = 'withdrawCoinFromHeroId(uint256 id,uint256 amount)';

interface IHeroWallet {
  hero: IHero;
  owner: string;
  stake: number;
}

interface IUpdateStakeRanking {
  network: WalletNetwork;
}

@Injectable()
export class UpdateStakeRanking {
  constructor(
    private stakeRepository: StakeRepository,
    private stakeRankingHeroRepository: StakeRankingHeroRepository,
    private stakeRankingWalletRepository: StakeRankingWalletRepository,
    private totalsRepository: TotalsRepository,
    private heroRepository: HeroRepository,
    private walletRepository: WalletRepository,
  ) {}
  async execute({ network }: IUpdateStakeRanking) {
    // await this.stakeRepository.delete({ network });
    let transactions;
    const defaultBlock = 0;
    const lastBlockNumber =
      (
        await this.stakeRepository.findOne({
          where: { network },
          order: { blockNumber: 'DESC' },
        })
      )?.blockNumber ?? defaultBlock;

    Logger.log('buscando transacoes ' + network);
    if (network == WalletNetwork.BSC) {
      transactions = await this.getTransactionsBSC(lastBlockNumber);
    } else {
      transactions = await this.getTransactionsPolygon(lastBlockNumber);
    }
    Logger.log(`transactions ${transactions.length}`);
    const deposited = transactions
      .filter((transaction) => transaction.functionName == DEPOSIT_METHOD)
      .map(this.parseHeroAndStake);

    const withdraws = transactions
      .filter((transaction) => transaction.functionName == WITHDRAW_METHOD)
      .map(this.parseHeroAndStake);

    const newHeroes = await this.getHeroes(
      [...deposited, ...withdraws],
      network,
    );
    console.log('newHeroes', newHeroes.length);
    Logger.log(`newHeroes ${newHeroes.length}`);

    await this.insertDeposit(deposited, network, newHeroes);

    await this.withdrawStake(withdraws, network, newHeroes);
    Logger.log(`atualizando heroes`);
    const allHeroes = await this.updateHeroes(network);
    Logger.log(`allHeroes ${allHeroes.length}`);
    const amount = allHeroes.reduce((acc, item) => acc + item.stake, 0);

    Logger.log(`criando wallets heroes`);
    await this.createWallets([...deposited, ...withdraws], network);
    Logger.log(`atualizando ranking wallet`);
    await this.insertRankingWallet(allHeroes, network);
    Logger.log(`atualizando ranking heroes`);
    await this.insertRankingRarityHero(allHeroes, network, 0);
    await this.insertRankingRarityHero(allHeroes, network, 1);
    await this.insertRankingRarityHero(allHeroes, network, 2);
    await this.insertRankingRarityHero(allHeroes, network, 3);
    await this.insertRankingRarityHero(allHeroes, network, 4);
    await this.insertRankingRarityHero(allHeroes, network, 5);
    Logger.log(`atualizando totais`);
    await this.totalsRepository.insertOrUpdate(
      'stake-amount',
      amount.toString(),
      network,
    );
    await this.totalsRepository.insertOrUpdate(
      'stake-heroes',
      allHeroes.length.toString(),
      network,
    );
    await this.totalsRepository.insertOrUpdate(
      'stake-average',
      (amount / allHeroes.length).toString(),
      network,
    );
    Logger.log(`Terminou UpdateStakeRanking ${network}`);
  }

  async insertRankingRarityHero(
    heroes: IHeroWallet[],
    network: WalletNetwork,
    rarity: number,
  ) {
    await this.stakeRankingHeroRepository.delete({
      network,
      rarity,
    });

    const heroesGroupedByRarity = heroes
      .filter((hero) => !hero.hero.burned && hero.hero.rarityIndex == rarity)
      .reduce(
        (acc, hero) => {
          if (!acc[hero.hero.id]) {
            acc[hero.hero.id] = {
              stake: 0,
              owner: '',
            };
          }
          acc[hero.hero.id]['stake'] += hero.stake;
          acc[hero.hero.id]['owner'] = hero.owner;
          return acc;
        },
        {} as Record<number, { stake: number; owner: string }>,
      );
    const heroesGroupedByRaritySortedByStakeDescArray = Object.entries(
      heroesGroupedByRarity,
    ).sort((a, b) => b[1].stake - a[1].stake);

    await this.stakeRankingHeroRepository.save(
      heroesGroupedByRaritySortedByStakeDescArray.map(
        ([heroId, hero], index) => {
          return {
            network,
            heroId: heroId,
            amount: hero.stake,
            wallet: hero.owner,
            rarity,
            position: index + 1,
          };
        },
      ),
    );

    // await Promise.all(
    //   heroesGroupedByRaritySortedByStakeDescArray.map(
    //     async ([heroId, hero], index) => {
    //       await this.stakeRankingHeroRepository.save({
    //         network,
    //         heroId: heroId,
    //         amount: hero.stake,
    //         wallet: hero.owner,
    //         rarity,
    //         position: index + 1,
    //       });
    //     },
    //   ),
    // );
  }

  async insertRankingWallet(heroes: IHeroWallet[], network: WalletNetwork) {
    await this.stakeRankingWalletRepository.delete({
      network,
    });

    const heroesGroupedByWallet = heroes
      .filter((wallet) => wallet.owner)
      .reduce(
        (acc, hero) => {
          if (!acc[hero.owner]) {
            acc[hero.owner] = 0;
          }
          acc[hero.owner] += hero.stake;
          return acc;
        },
        {} as Record<string, number>,
      );
    const heroesGroupedByWalletSortedByStakeDescArray = Object.entries(
      heroesGroupedByWallet,
    ).sort((a, b) => b[1] - a[1]);

    await this.stakeRankingWalletRepository.save(
      heroesGroupedByWalletSortedByStakeDescArray.map(
        ([wallet, stake], index) => {
          return {
            network,
            wallet,
            amount: stake,
            position: index + 1,
          };
        },
      ),
    );

    // await Promise.all(
    //   heroesGroupedByWalletSortedByStakeDescArray.map(
    //     async ([wallet, stake], index) => {
    //       await this.stakeRankingWalletRepository.save({
    //         network,
    //         wallet,
    //         amount: stake,
    //         position: index + 1,
    //       });
    //     },
    //   ),
    // );
  }

  async getHeroes(allTransactions: Transaction[], network: WalletNetwork) {
    const ids = Array.from(new Set(allTransactions.map((item) => item.heroId)));

    return await getHeroesWithStakeOwnerFromIds(ids, network);
  }

  async createWallets(allTransactions: Transaction[], network: WalletNetwork) {
    //remove duplicates
    const walletsIds = Array.from(
      new Set(allTransactions.map((item) => item.from.toLowerCase())),
    );
    const wallets = walletsIds.map((walletId) => ({
      walletId,
      network,
    }));

    return await this.walletRepository.upsert(wallets, ['walletId', 'network']);
  }

  async updateHeroes(network: WalletNetwork) {
    const heroIds = await this.stakeRepository.getHeroes(network);

    const heroes = await getHeroesWithStakeOwnerFromIds(
      heroIds.map((h) => h.heroId),
      network,
    );
    //count time to finish
    const chunks = chunkArray<IHeroWallet>(heroes, 1000);

    for (const chunk of chunks) {
      await this.heroRepository.updateOrInsertArray(
        chunk.map(
          (hero) =>
            ({
              ...hero.hero,
              wallet: hero.owner,
            }) as unknown as Hero,
        ),
        network,
      );
    }

    return heroes;
  }

  async withdrawStake(
    transactions: Transaction[],
    network,
    heroes: IHeroWallet[],
  ) {
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
              (item) => item.hero.id == transaction.heroId,
            );
            if (!heroOwner) {
              return null;
            }
            return {
              heroId: heroOwner.hero?.id.toString(),
              rarity: !heroOwner.hero.burned
                ? Number(heroOwner.hero?.rarityIndex)
                : null,
              amount: -transaction.stake,
              network,
              currentWallet: heroOwner.owner,
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
    heroes: IHeroWallet[],
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
              (item) => item.hero.id == transaction.heroId,
            );
            if (!heroOwner) {
              return null;
            }
            return {
              heroId: heroOwner.hero?.id.toString(),
              rarity: !heroOwner.hero.burned
                ? Number(heroOwner.hero?.rarityIndex)
                : null,
              amount: transaction.stake,
              currentWallet: heroOwner.owner,
              date: new Date(Number(transaction.timeStamp) * 1000),
              network,
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
      url: 'https://api.polygonscan.com/api',
      address: '0x810570AA7e16cF14DefD69D4C9796f3c1Abe2d13',
      apiKey: 'GSIGZP5QJ5NRNNDPHPKTFH4FCU4FYG4D3C',
      startBlock,
    });
  }

  async getTransactionsBSC(startBlock: number | string) {
    return this.getTransactions([], {
      url: 'https://api.bscscan.com/api',
      address: '0x053282c295419e67655a5032a4da4e3f92d11f17',
      apiKey: '4C3DSD3PYF1RFPHVHER2MD8B4U36RPF1NC',
      startBlock,
    });
  }
  async getTransactions(
    values: Transaction[] = [],
    { url, address, apiKey, startBlock = 0 }: any,
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
      },
    });

    if (data.result.length == 10000) {
      return this.getTransactions([...values, ...data.result], {
        url,
        address,
        apiKey,
        startBlock: data.result[9999].blockNumber,
      });
    }

    return [...values, ...data.result];
  }

  parseHeroAndStake(transaction: Transaction) {
    //convert hex to dec
    const heroId = parseInt(transaction.input.slice(10, 74), 16);
    const stake = parseInt(transaction.input.slice(74), 16) / 10 ** 18;
    return {
      ...transaction,
      heroId,
      stake,
    };
  }
}
