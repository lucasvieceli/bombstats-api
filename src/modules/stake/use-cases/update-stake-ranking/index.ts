import { WalletNetwork } from '@/database/models/Wallet';
import { StakeRankingHeroRepository } from '@/database/repositories/stake-ranking-hero';
import { StakeRankingWalletRepository } from '@/database/repositories/stake-ranking-wallet';
import { StakeRepository } from '@/database/repositories/stake-repository';
import { TotalsRepository } from '@/database/repositories/totals-repository';
import { chunkArray, executePromisesBlock } from '@/utils';
import { ABI_HERO } from '@/utils/web3/ABI/hero-abi';
import { ABI_STAKE } from '@/utils/web3/ABI/stake-abi';
import { IHero, decodeHero } from '@/utils/web3/hero';
import {
  getContractMultiCallBsc,
  getContractMultiCallPolygon,
  instanceBscWeb3,
  instancePolygonWeb3,
} from '@/utils/web3/web3';
import { Injectable } from '@nestjs/common';
import axios from 'axios';

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
  ) {}
  async execute({ network }: IUpdateStakeRanking) {
    await this.stakeRepository.delete({ network });
    let transactions;

    console.log('buscando');
    if (network == WalletNetwork.BSC) {
      transactions = await this.getTransactionsBSC();
    } else {
      transactions = await this.getTransactionsPolygon();
    }
    console.log('transactions', transactions.length);
    const deposited = transactions
      .filter((transaction) => transaction.functionName == DEPOSIT_METHOD)
      .map(this.parseHeroAndStake);

    const withdraws = transactions
      .filter((transaction) => transaction.functionName == WITHDRAW_METHOD)
      .map(this.parseHeroAndStake);

    const allHeroes = await this.getHeroes(
      [...deposited, ...withdraws],
      network,
    );

    const amount = allHeroes.reduce((acc, item) => acc + item.stake, 0);

    await Promise.all([
      this.insertRankingWallet(allHeroes, network),
      this.insertRankingRarityHero(allHeroes, network, 0),
      this.insertRankingRarityHero(allHeroes, network, 1),
      this.insertRankingRarityHero(allHeroes, network, 2),
      this.insertRankingRarityHero(allHeroes, network, 3),
      this.insertRankingRarityHero(allHeroes, network, 4),
      this.insertRankingRarityHero(allHeroes, network, 5),
      this.totalsRepository.insertOrUpdate(
        'stake-amount',
        amount.toString(),
        network,
      ),
      this.totalsRepository.insertOrUpdate(
        'stake-heroes',
        allHeroes.length.toString(),
        network,
      ),
      this.totalsRepository.insertOrUpdate(
        'stake-average',
        (amount / allHeroes.length).toString(),
        network,
      ),
    ]);

    await this.insertDeposit(deposited, network, allHeroes);

    await this.withdrawStake(withdraws, network, allHeroes);

    console.log(`Terminou UpdateStakeRanking ${network}`);
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

    await Promise.all(
      heroesGroupedByRaritySortedByStakeDescArray.map(
        async ([heroId, hero], index) => {
          await this.stakeRankingHeroRepository.save({
            network,
            heroId: heroId,
            amount: hero.stake,
            wallet: hero.owner,
            rarity,
            position: index + 1,
          });
        },
      ),
    );
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

    await Promise.all(
      heroesGroupedByWalletSortedByStakeDescArray.map(
        async ([wallet, stake], index) => {
          await this.stakeRankingWalletRepository.save({
            network,
            wallet,
            amount: stake,
            position: index + 1,
          });
        },
      ),
    );
  }

  async getHeroes(allTransactions: Transaction[], network: WalletNetwork) {
    const ids = Array.from(new Set(allTransactions.map((item) => item.heroId)));

    const fnInstance =
      network === WalletNetwork.BSC ? instanceBscWeb3 : instancePolygonWeb3;
    const fnContractMult =
      network === WalletNetwork.BSC
        ? getContractMultiCallBsc()
        : getContractMultiCallPolygon();

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

    const chuncks = chunkArray(ids, 500);

    let resultHeroes = [];
    for (const ids of chuncks) {
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

      resultHeroes = [
        ...resultHeroes,
        ...(await Promise.all(
          heroes.map(async (item, index) => ({
            hero: await decodeHero(item, 0, ids[index]),
            owner: wallets[index],
            stake: Number((stakes[index] as any) / divisor),
          })),
        )),
      ];
    }

    return resultHeroes;
  }

  async withdrawStake(
    transactions: Transaction[],
    network,
    heroes: IHeroWallet[],
  ) {
    const promisesSearchHero = chunkArray<Transaction>(transactions, 1000).map(
      (chunk) => async () => {
        await Promise.all(
          chunk.map(async (transaction) => {
            const heroOwner = heroes.find(
              (item) => item.hero.id == transaction.heroId,
            );
            if (transaction) {
              await this.stakeRepository.save({
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
              });
            }
          }),
        );
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
        await Promise.all(
          chunk.map(async (transaction) => {
            const heroOwner = heroes.find(
              (item) => item.hero.id == transaction.heroId,
            );

            if (transaction) {
              await this.stakeRepository.save({
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
              });
            }
          }),
        );
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

  async getTransactionsPolygon() {
    return this.getTransactions([], {
      url: 'https://api.polygonscan.com/api',
      address: '0x810570AA7e16cF14DefD69D4C9796f3c1Abe2d13',
      apiKey: 'GSIGZP5QJ5NRNNDPHPKTFH4FCU4FYG4D3C',
    });
  }

  async getTransactionsBSC() {
    return this.getTransactions([], {
      url: 'https://api.bscscan.com/api',
      address: '0x053282c295419e67655a5032a4da4e3f92d11f17',
      apiKey: '4C3DSD3PYF1RFPHVHER2MD8B4U36RPF1NC',
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
