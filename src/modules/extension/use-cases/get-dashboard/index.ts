import { WalletNetwork } from '@/database/models/Wallet';
import { TotalsRepository } from '@/database/repositories/totals-repository';
import { SocketService } from '@/services/websocket';
import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';

interface IGetDashboard {
  network: WalletNetwork;
}

@Injectable()
export class GetDashboard {
  constructor(
    private totalsRepository: TotalsRepository,
    private socketService: SocketService,
  ) {}
  async execute({ network }: IGetDashboard) {
    const result = await this.totalsRepository.find({
      where: {
        network,
        name: In([
          'stake-heroes',
          'stake-sen-heroes',
          'stake-average',
          'stake-sen-average',
          'stake-amount',
          'stake-sen-amount',
          'sens',
          'matic',
          'extension-online',
          'extension-installed',
          'bnb',
          'bcoin',
        ]),
      },
    });

    const sens = result?.find((r) => r.name === 'sens');
    const matic = result?.find((r) => r.name === 'matic');
    const bnb = result?.find((r) => r.name === 'bnb');
    const bcoin = result?.find((r) => r.name === 'bcoin');

    return {
      stake: {
        heroes: Number(result?.find((r) => r.name === 'stake-heroes')?.value),
        average: Number(result?.find((r) => r.name === 'stake-average')?.value),
        amount: Number(result?.find((r) => r.name === 'stake-amount')?.value),
      },
      stakeSen: {
        heroes: Number(
          result?.find((r) => r.name === 'stake-sen-heroes')?.value,
        ),
        average: Number(
          result?.find((r) => r.name === 'stake-sen-average')?.value,
        ),
        amount: Number(
          result?.find((r) => r.name === 'stake-sen-amount')?.value,
        ),
      },
      tokens: {
        sens: {
          price: Number(sens?.value),
          percentage: Number(sens?.additional?.percentage),
        },
        matic: {
          price: Number(matic?.value),
          percentage: Number(matic?.additional?.percentage),
        },
        bnb: {
          price: Number(bnb?.value),
          percentage: Number(bnb?.additional?.percentage),
        },
        bcoin: {
          price: Number(bcoin?.value),
          percentage: Number(bcoin?.additional?.percentage),
        },
      },
      extension: {
        online: Number(
          result?.find((r) => r.name === 'extension-online')?.value,
        ),
        installed: Number(
          result?.find((r) => r.name === 'extension-installed')?.value,
        ),
        ...this.socketService.getStats(network),
      },
    };
  }
}
