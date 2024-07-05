import { Wallet, WalletNetwork } from '@/database/models/Wallet';
import { MapBlockRepository } from '@/database/repositories/map-block-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { Injectable } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { randomUUID } from 'crypto';
import { Socket } from 'socket.io';

interface IWalletConnected {
  wallet: string;
  network: string;
}

interface IEmitEventMapReward {
  resetMap?: boolean;
  cage?: boolean;
  block?: {
    type: number;
    value: number;
  };
}

interface IEmitEventMapUpdate {
  blocks: {
    hp: any;
    i: any;
    j: any;
    rewards: {
      type: number;
      value: number;
    }[];
  }[];
}

@Injectable()
export class SocketService {
  protected events: [string, any][] = [];

  constructor(
    private mapBlockRepository: MapBlockRepository,
    private walletRepository: WalletRepository,
  ) {}

  private readonly connectedClients: Map<
    string,
    {
      socket: Socket;
      wallets?: IWalletConnected[];
    }
  > = new Map();

  handleConnection(socket: Socket): void {
    const clientId = socket.id;
    this.connectedClients.set(clientId, { socket, wallets: [] });

    socket.on('disconnect', () => {
      this.connectedClients.delete(clientId);
    });

    socket.on('listen-wallet', async (params) => {
      const wallets = this.connectedClients.get(clientId)?.wallets || [];

      this.connectedClients.set(clientId, {
        socket,
        wallets: [...wallets, params],
      });
      const wallet = await this.walletRepository.findOne({
        where: {
          walletId: params.wallet?.toLowerCase(),
          network: params.network?.toUpperCase(),
        },
      });
      if (wallet) {
        this.emitEventCurrentMap(wallet);
      }
    });
    socket.on('unlisten-listen-wallet', (params) => {
      const wallets = this.connectedClients.get(clientId)?.wallets || [];

      this.connectedClients.set(clientId, {
        socket,
        wallets: wallets.filter(
          (w) =>
            w.wallet.toUpperCase() !== params.wallet.toUpperCase() &&
            w.network.toUpperCase() !== params.network.toUpperCase(),
        ),
      });
    });

    this.events.forEach(([name, fn]) => {
      socket.on(name, fn);
    });
  }

  emitEventWallet(
    event: string,
    wallet: string,
    network: WalletNetwork,
    data: any,
  ): void {
    this.connectedClients.forEach(({ socket, wallets }) => {
      if (
        wallets &&
        wallets.some(
          (w) =>
            w.wallet.toUpperCase() === wallet.toUpperCase() &&
            w.network.toUpperCase() === network.toUpperCase(),
        )
      ) {
        socket.emit(event, data);
      }
    });
  }

  async emitEventCurrentMap(wallet: Wallet) {
    const map = await this.mapBlockRepository.getCurrentMap(wallet.id);
    this.emitEventWallet('current-map', wallet.walletId, wallet.network, {
      wallet: wallet.walletId,
      network: wallet.network,
      map,
    });
  }

  async emitEventMapUpdate(wallet: Wallet, value: IEmitEventMapUpdate) {
    // const map = await this.mapBlockRepository.getCurrentMap(wallet.id);
    this.emitEventWallet('map-update', wallet.walletId, wallet.network, {
      wallet: wallet.walletId,
      network: wallet.network,
      value,
    });
  }

  async emitEventMapReward(wallet: Wallet, params: IEmitEventMapReward) {
    this.emitEventWallet('map-reward', wallet.walletId, wallet.network, {
      wallet: wallet.walletId,
      network: wallet.network,
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      ...params,
    });
  }

  addEventListeners(name: string, fn: any): void {
    this.events.push([name, fn]);
  }
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server: Socket;

  constructor(private readonly socketService: SocketService) {}

  handleConnection(socket: Socket): void {
    this.socketService.handleConnection(socket);
  }

  // Implement other Socket.IO event handlers and message handlers
}
