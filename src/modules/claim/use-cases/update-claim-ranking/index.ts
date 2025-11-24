import { Claim, ClaimToken } from '@/database/models/Claim';
import { WalletNetwork } from '@/database/models/Wallet';
import { ClaimRankingWalletRepository } from '@/database/repositories/claim-ranking-wallet-repository';
import { ClaimRepository } from '@/database/repositories/claim-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { executePromisesBlock } from '@/utils';
import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface Transaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

const contractPolygon: Record<ClaimToken, string> = {
  [ClaimToken.BCOIN]: process.env.CONTRACT_BOMB_POLYGON!,
  [ClaimToken.SEN]: process.env.CONTRACT_SEN_POLYGON!,
};
const contractBSC: Record<ClaimToken, string> = {
  [ClaimToken.BCOIN]: process.env.CONTRACT_BOMB_BSC!,
  [ClaimToken.SEN]: process.env.CONTRACT_SEN_BSC!,
};

interface IUpdateClaimRanking {
  network: WalletNetwork;
  token: ClaimToken;
}

@Injectable()
export class UpdateClaimRanking {
  constructor(
    private claimRepository: ClaimRepository,
    private claimRankingWalletRepository: ClaimRankingWalletRepository,
    private walletRepository: WalletRepository,
  ) {}

  async execute({ network, token }: IUpdateClaimRanking) {
    const defaultBlock =
      network == WalletNetwork.POLYGON ? '42097604' : '39246976';
    const lastBlockNumber =
      (
        await this.claimRepository.findOne({
          where: { network, token },
          order: { blockNumber: 'DESC' },
        })
      )?.blockNumber ?? defaultBlock;

    const transactions = await (network === WalletNetwork.POLYGON
      ? this.getTransactionsPolygon(parseInt(lastBlockNumber), token)
      : this.getTransactionsBSC(parseInt(lastBlockNumber), token));

    console.log(
      `Encontrou ${transactions.length} transações de claim tokens ${network}`,
    );

    await this.createWallets(transactions, network);
    await this.insertTransactions(transactions, network, token);
    await this.claimRankingWalletRepository.updateClaimRankingLastSevenDays(
      network,
      token,
    );
    console.log(
      `Salvou ${transactions.length} transações de claim tokens ${network}`,
    );
  }

  async insertTransactions(
    transactions: Transaction[],
    network: WalletNetwork,
    token: ClaimToken,
  ) {
    const promises = transactions.map((transaction) => async () => {
      const exists = await this.claimRepository.findOne({
        where: { hash: transaction.hash },
      });
      if (exists) {
        return;
      }
      const claim = new Claim();
      claim.blockNumber = transaction.blockNumber;
      claim.hash = transaction.hash;
      claim.wallet = transaction.to;
      claim.token = token;
      claim.amount = Number(transaction.value) / 10 ** 18;
      claim.tokenSymbol = transaction.tokenSymbol;
      claim.createdAt = new Date(parseInt(transaction.timeStamp) * 1000);
      claim.network = network;
      await this.claimRepository.save(claim);
    });

    return executePromisesBlock(
      promises,
      1000,
      'allSettled',
      0,
      'insertTransactions',
    );
  }

  async createWallets(allTransactions: Transaction[], network: WalletNetwork) {
    console.log(
      'allTransactions',
      allTransactions.filter((item) => !item.from),
    );
    // remove duplicates and drop empty wallet addresses to avoid invalid inserts
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

    return await this.walletRepository.upsert(wallets, ['walletId', 'network']);
  }

  async getTransactionsPolygon(lastBlockNumber: number, token: ClaimToken) {
    const contractAddress = contractPolygon[token];
    const transactions = await this.getTransactions([], {
      url: 'https://api.etherscan.io/v2/api',
      address: '0x7e396e19322DE2edA8CA300b436ED4eCA955c366',
      contractAddress,
      apiKey: process.env.ETHERSCAN_KEY!,
      chainid: 137,
      startBlock: lastBlockNumber,
    });

    return transactions.filter(
      (transaction) =>
        transaction.to?.toLowerCase() !==
        '0x7e396e19322DE2edA8CA300b436ED4eCA955c366'.toLowerCase(),
    );
  }

  async getTransactionsBSC(lastBlockNumber: number, token: ClaimToken) {
    const contractAddress = contractBSC[token];
    const transactions = await this.getTransactions([], {
      url: 'https://api.etherscan.io/v2/api',
      address: '0xBf6bDA4Fc8e627BbE5359F99Ec8ce757dABEa11c',
      apiKey: process.env.ETHERSCAN_KEY!,
      contractAddress,
      chainid: 56,
      startBlock: lastBlockNumber,
    });
    return transactions.filter(
      (transaction) =>
        transaction.to?.toLowerCase() !==
        '0xBf6bDA4Fc8e627BbE5359F99Ec8ce757dABEa11c'.toLowerCase(),
    );
  }

  async getTransactions(
    values: Transaction[] = [],
    { url, address, apiKey, startBlock = 0, contractAddress, chainid }: any,
  ): Promise<Transaction[]> {
    const { data } = await axios.get(url, {
      params: {
        module: 'account',
        action: 'tokentx',
        address,
        startblock: startBlock,
        endblock: 9999999999,
        contractAddress,
        sort: 'asc',
        apikey: apiKey,
        page: 1,
        offset: 10000,
        chainid,
      },
    });

    if (!Array.isArray(data.result)) {
      const message =
        typeof data.result === 'string' ? data.result : 'Unexpected response';
      const error = `Failed to fetch transactions: ${message}`;
      console.warn(error, { status: data.status, chainid, startBlock });
      throw new Error(error);
    }

    if (data.result.length == 10000) {
      return this.getTransactions([...values, ...data.result], {
        url,
        address,
        apiKey,
        startBlock: data.result[9999].blockNumber,
        contractAddress,
        chainid,
      });
    }

    return [...values, ...data.result];
  }
}
