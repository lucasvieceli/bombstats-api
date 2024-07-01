import { WalletNetwork } from '@/database/models/Wallet';
import { StakeRepository } from '@/database/repositories/stake-repository';
import { chunkArray, executePromisesBlock } from '@/utils';
import { IHero, getHeroesFromIds } from '@/utils/web3/hero';
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

interface IUpdateStakeRanking {
  network: WalletNetwork;
}

@Injectable()
export class UpdateStakeRanking {
  constructor(private stakeRepository: StakeRepository) {}
  async execute({ network }: IUpdateStakeRanking) {
    await this.stakeRepository.delete({ network });
    let transactions;

    if (network == WalletNetwork.BSC) {
      transactions = await this.getTransactionsBSC();
    } else {
      transactions = await this.getTransactionsPolygon();
    }

    const deposited = transactions
      .filter((transaction) => transaction.functionName == DEPOSIT_METHOD)
      .map(this.parseHeroAndStake);

    await this.insertDeposit(deposited, network);

    const withdraws = transactions
      .filter((transaction) => transaction.functionName == WITHDRAW_METHOD)
      .map(this.parseHeroAndStake);

    await this.withdrawStake(withdraws, network);
    await this.stakeRepository.updateStakeWalletRanking(network);
    console.log(`Terminou UpdateStakeRanking ${network}`);
  }

  async withdrawStake(transactions: Transaction[], network) {
    const promisesSearchHero = chunkArray<Transaction>(transactions, 1000).map(
      (chunk) => async () => {
        const ids = chunk.map((item) => item.heroId) as unknown as string[];
        const heroes = await getHeroesFromIds(ids, network);

        await Promise.all(
          chunk.map(async (transaction) => {
            const hero = heroes.find((item) => item.id == transaction.heroId);

            if (transaction && hero?.id) {
              await this.stakeRepository.save({
                heroId: hero?.id.toString(),
                rarity: hero?.rarity ? Number(hero?.rarityIndex) : null,
                amount: -transaction.stake,
                network,
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

  async insertDeposit(deposited: Transaction[], network: WalletNetwork) {
    const promisesSearchHero = chunkArray<Transaction>(deposited, 1000).map(
      (chunk) => async () => {
        const ids = chunk.map((item) => item.heroId) as unknown as string[];
        const heroes = await getHeroesFromIds(ids, network);

        await Promise.all(
          chunk.map(async (transaction) => {
            const hero = heroes.find((item) => item.id == transaction.heroId);

            if (transaction && hero?.id) {
              await this.stakeRepository.save({
                heroId: hero?.id.toString(),
                rarity: hero?.rarity ? Number(hero?.rarityIndex) : null,
                amount: transaction.stake,
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
