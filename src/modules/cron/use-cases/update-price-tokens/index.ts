import { WalletNetwork } from '@/database/models/Wallet';
import { TotalsRepository } from '@/database/repositories/totals-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { SocketService } from '@/services/websocket';
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class UpdatePriceTokens {
  constructor(
    private totalsRepository: TotalsRepository,
    private walletRepository: WalletRepository,
    private socketService: SocketService,
  ) {}

  async execute() {
    await Promise.all([this.updateTokens(), this.updateExtension()]);
  }

  async updateExtension() {
    const [installedPolygon, installedBsc] = await Promise.all([
      this.walletRepository.getTotalInstalled(WalletNetwork.POLYGON),
      this.walletRepository.getTotalInstalled(WalletNetwork.BSC),
    ]);
    const onlineBsc = this.socketService.getTotalExtensionOnline(
      WalletNetwork.BSC,
    );
    const onlinePolygon = this.socketService.getTotalExtensionOnline(
      WalletNetwork.POLYGON,
    );

    await this.totalsRepository.insertOrUpdate(
      'extension-online',
      onlinePolygon.toString(),
      WalletNetwork.POLYGON,
    );
    await this.totalsRepository.insertOrUpdate(
      'extension-installed',
      installedPolygon.toString(),
      WalletNetwork.POLYGON,
    );
    await this.totalsRepository.insertOrUpdate(
      'extension-online',
      onlineBsc.toString(),
      WalletNetwork.BSC,
    );
    await this.totalsRepository.insertOrUpdate(
      'extension-installed',
      installedBsc.toString(),
      WalletNetwork.BSC,
    );
  }

  async updateTokens() {
    const tokens = await this.getPriceToken();

    if (!tokens?.length) return;

    await this.insertToken(
      'bombcrypto-coin',
      'bcoin',
      WalletNetwork.POLYGON,
      tokens,
    );
    await this.insertToken('bomber-coin', 'bcoin', WalletNetwork.BSC, tokens);
    await this.insertToken(
      'senspark-matic',
      'sens',
      WalletNetwork.POLYGON,
      tokens,
    );
    await this.insertToken('senspark', 'sens', WalletNetwork.BSC, tokens);
    await this.insertToken(
      'matic-network',
      'matic',
      WalletNetwork.POLYGON,
      tokens,
    );
    await this.insertToken('binancecoin', 'bnb', WalletNetwork.BSC, tokens);
  }

  async insertToken(
    name: string,
    nameToken: string,
    network: WalletNetwork,
    tokens: any[],
  ) {
    const token = tokens.find((t) => t.id == name);

    await this.totalsRepository.upsert(
      {
        name: nameToken,
        network,
        value: token.currentPrice,
        additional: { percentage: token.percentage },
      },
      ['name', 'network'],
    );
  }

  async getPriceToken() {
    try {
      const data = await axios.get(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bombcrypto-coin,bomber-coin,senspark-matic,senspark,matic-network,binancecoin`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return (
        data.data?.map((item) => ({
          id: item.id,
          currentPrice: item.current_price,
          percentage: item.price_change_percentage_24h,
        })) || []
      );
    } catch (e) {
      console.log(' deu erro', e.message);
    }
  }
}
