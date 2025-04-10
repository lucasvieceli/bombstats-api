import { WalletNetwork } from '@/database/models/Wallet';
import { HeroUpdateQueue } from '@/modules/hero/processors/hero-update';
import { UpdateHeroesById } from '@/modules/hero/use-cases/update-heroes-by-id';
import { HouseUpdateQueue } from '@/modules/house/processors/house-update';
import { ABI_MARKET } from '@/utils/web3/ABI/market';
import { ABI_ROCK } from '@/utils/web3/ABI/rock-abi';
import { ABI_STAKE } from '@/utils/web3/ABI/stake-abi';
import { decodeInputTransaction } from '@/utils/web3/web3';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

export type BodyQuicknode = {
  matchedReceipts: Array<{
    blockHash: string;
    blockNumber: string;
    contractAddress: string;
    cumulativeGasUsed: string;
    effectiveGasPrice: string;
    from: string;
    gasUsed: string;
    logs: Array<{
      address: string;
      blockHash: string;
      blockNumber: string;
      data: string;
      logIndex: string;
      removed: boolean;
      topics: Array<string>;
      transactionHash: string;
      transactionIndex: string;
    }>;
    logsBloom: string;
    status: string;
    to: string;
    transactionHash: string;
    transactionIndex: string;
    type: string;
  }>;
  matchedTransactions: Array<{
    accessList: Array<any>;
    blockHash: string;
    blockNumber: string;
    chainId: string;
    from: string;
    gas: string;
    gasPrice: string;
    hash: string;
    input: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    nonce: string;
    r: string;
    s: string;
    to: string;
    transactionIndex: string;
    type: string;
    v: string;
    value: string;
  }>;
};

@Processor('webhook-quicknode', { concurrency: 10 })
export class OnWebhookQuicknode extends WorkerHost {
  constructor(
    private updateHeroesById: UpdateHeroesById,
    @InjectQueue('on-hero-retail') private readonly onHeroRetail: Queue,
    @InjectQueue('on-house-retail') private readonly onHouseRetail: Queue,
    @InjectQueue('hero-update') private readonly heroUpdate: HeroUpdateQueue,
    @InjectQueue('house-update') private readonly houseUpdate: HouseUpdateQueue,
  ) {
    super();
  }

  async process(data: Job<BodyQuicknode>): Promise<any> {
    const body = data.data;

    body.matchedTransactions.forEach(async (transaction) => {
      const network =
        transaction.chainId === '0x89'
          ? WalletNetwork.POLYGON
          : WalletNetwork.BSC;
      if (
        [
          process.env.CONTRACT_STAKE_POLYGON!.toLowerCase(),
          process.env.CONTRACT_STAKE_BSC!.toLowerCase(),
        ].includes(transaction.to.toLowerCase())
      ) {
        this.onStake(transaction, network);
        // on change stake hero
      } else if (
        [
          process.env.CONTRACT_HERO_MARKET_POLYGON!.toLowerCase(),
          process.env.CONTRACT_HERO_MARKET_BSC!.toLowerCase(),
        ].includes(transaction.to.toLowerCase())
      ) {
        this.onHero(transaction, network);
        // on list hero
      } else if (
        [
          process.env.CONTRACT_ROCK_POLYGON!.toLowerCase(),
          process.env.CONTRACT_ROCK_BSC!.toLowerCase(),
        ].includes(transaction.to.toLowerCase())
      ) {
        this.onRock(transaction, network);
      } else if (
        [
          process.env.CONTRACT_HOUSE_MARKET_POLYGON!.toLowerCase(),
          process.env.CONTRACT_HOUSE_MARKET_BSC!.toLowerCase(),
        ].includes(transaction.to.toLowerCase())
      ) {
        this.onHouse(transaction, network);
        // on list house
      }
    });
  }

  async onRock(
    data: BodyQuicknode['matchedTransactions'][0],
    network: WalletNetwork,
  ) {
    if (
      data.input.startsWith('0x2e61a0fe') ||
      data.input.startsWith('0x30dd629d')
    ) {
      const method = data.input.startsWith('0x2e61a0fe')
        ? 'createRock'
        : 'fusion';

      const result = decodeInputTransaction(data.input, method, ABI_ROCK);
      const ids = result?.[0].map((id) => id.toString());

      Logger.debug(`${method} ${ids} ${network}`, 'OnWebhookQuicknode');
      this.heroUpdate.add('hero-update', {
        heroes: ids,
        network,
      });
    }
  }

  async onHouse(
    data: BodyQuicknode['matchedTransactions'][0],
    network: WalletNetwork,
  ) {
    if (
      data.input.startsWith('0x23b70d76') ||
      data.input.startsWith('0xd6febde8') ||
      data.input.startsWith('0x514fcac7')
    ) {
      if (data.input.startsWith('0x514fcac7')) {
        const result = decodeInputTransaction(
          data.input,
          'cancelOrder',
          ABI_MARKET,
        );
        Logger.debug(
          `house retail cancel order ${result?.[0]} ${network}`,
          'OnWebhookQuicknode',
        );
        if (result?.[0].toString()) {
          await this.houseUpdate.add('house-update', {
            houses: [result[0].toString()],
            network,
          });
        }
        return;
      }
      const method = data.input.startsWith('0x23b70d76')
        ? 'createOrder'
        : 'buy';

      const result = decodeInputTransaction(data.input, method, ABI_MARKET);

      Logger.debug(`${method} ${result?.[0]}`, 'OnWebhookQuicknode');
      if (result?.[0].toString()) {
        await this.onHouseRetail.add('on-house-retail', {
          id: result[0].toString(),
          amount: Number(result[1]) / 10 ** 18,
          type: method === 'createOrder' ? 'listed' : 'sold',
          network,
          marketPlace: 'market',
          tokenAddress: result?.[2],
        });
      }
    }
  }

  async onHero(
    data: BodyQuicknode['matchedTransactions'][0],
    network: WalletNetwork,
  ) {
    if (
      data.input.startsWith('0x23b70d76') ||
      data.input.startsWith('0xd6febde8') ||
      data.input.startsWith('0x514fcac7')
    ) {
      if (data.input.startsWith('0x514fcac7')) {
        const result = decodeInputTransaction(
          data.input,
          'cancelOrder',
          ABI_MARKET,
        );
        Logger.debug(
          `hero retail cancel order ${result?.[0]} ${network}`,
          'OnWebhookQuicknode',
        );
        if (result?.[0].toString()) {
          await this.heroUpdate.add('hero-update', {
            heroes: [result[0].toString()],
            network,
          });
        }
        return;
      }

      const method = data.input.startsWith('0x23b70d76')
        ? 'createOrder'
        : 'buy';

      const result = decodeInputTransaction(data.input, method, ABI_MARKET);

      if (result?.[0].toString()) {
        await this.onHeroRetail.add('on-hero-retail', {
          id: result[0].toString(),
          amount: Number(result[1]) / 10 ** 18,
          type: method === 'createOrder' ? 'listed' : 'sold',
          network,
          marketPlace: 'market',
          tokenAddress: result?.[2],
        });
      }
    } else {
      console.log(data, 'data');
    }
  }
  async onStake(
    data: BodyQuicknode['matchedTransactions'][0],
    network: WalletNetwork,
  ) {
    if (
      data.input.startsWith('0x195be1b1') ||
      data.input.startsWith('0xcaacf34d')
    ) {
      const result = decodeInputTransaction(data.input, 'depositV2', ABI_STAKE);
      Logger.debug(`stake ${result?.[1]} ${network}`, 'OnWebhookQuicknode');

      if (result?.[1].toString()) {
        await this.heroUpdate.add('hero-update', {
          heroes: [result[1].toString()],
          network,
        });
      }
    }
  }
}
