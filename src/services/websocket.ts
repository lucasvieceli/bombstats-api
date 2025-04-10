import { Hero } from '@/database/models/Hero';
import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Queue } from 'bullmq';
import { Socket } from 'socket.io';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const io = require('@pm2/io');

const webSocketPm2 = io.metric({
  name: 'Connections Site',
});
webSocketPm2.set(1111);

interface IWalletConnected {
  wallet: string;
  network: string;
}

@Injectable()
export class SocketService {
  protected events: [string, any][] = [];

  constructor(
    @InjectQueue('extension-message') private readonly extensionMessage: Queue,
  ) {}

  private readonly connectedClients: Map<
    string,
    {
      socket: Socket;
      wallets?: IWalletConnected[];
    }
  > = new Map();
  private readonly connectedExtension: Map<
    string,
    {
      socket: Socket;
      wallet: string;
      network: string;
    }
  > = new Map();
  private readonly connectedRetail: Map<
    string,
    {
      socket: Socket;
      network: WalletNetwork;
    }
  > = new Map();

  handleConnection(socket: Socket): void {
    const clientId = socket.id;

    const params = socket.handshake.query;

    if (params.extension) {
      this.connectedExtension.set(
        this.getIdSocketExtension(
          params.wallet as string,
          params.network as string,
        ),
        {
          socket,
          wallet: (params.wallet as string).toLowerCase(),
          network: (params.network as string).toUpperCase(),
        },
      );
    } else if (params.retail) {
      this.connectedRetail.set(clientId, {
        socket,
        network: (
          params.network as string
        )?.toUpperCase() as unknown as WalletNetwork,
      });
    } else {
      this.connectedClients.set(clientId, {
        socket,
        wallets: [],
      });
    }
    webSocketPm2.set(this.connectedClients.size);
    // console.log({
    //   connectedRetail: this.connectedRetail.size,
    //   connectionsClients: this.connectedClients.size,
    //   connectionsExtension: this.connectedExtension.size,
    // });

    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });

    socket.on('listen-wallet', async (params) => {
      const wallets = this.connectedClients.get(clientId)?.wallets || [];

      this.connectedClients.set(clientId, {
        socket,
        wallets: [...wallets, params],
      });

      const socketExtension = this.connectedExtension.get(
        this.getIdSocketExtension(params.wallet, params.network),
      );

      if (socketExtension) {
        socketExtension.socket.emit('get-current-values', {
          wallet: params.wallet,
          network: params.network,
        });
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
    socket.on('extension', (params) => {
      this.extensionMessage.add('extensionMessage', params);
    });
    this.events.forEach(([name, fn]) => {
      socket.on(name, fn);
    });
  }

  getStats(network: WalletNetwork) {
    return {
      total: {
        connectedRetail: this.connectedRetail.size,
        connectionsClients: this.connectedClients.size,
        connectionsExtension: this.connectedExtension.size,
      },
      accounts: Array.from(this.connectedExtension.values())
        .filter((v) => v.network === network.toUpperCase())
        .map((v) => v.wallet)
        .slice(0, 10),
    };
  }

  getIdSocketExtension(wallet: string, network: string) {
    return `${wallet.toLowerCase()}-${network.toUpperCase()}`;
  }
  handleDisconnect(socket: Socket): void {
    const params = socket.handshake.query;

    if (params.extension) {
      this.connectedExtension.delete(
        this.getIdSocketExtension(
          params.wallet as string,
          params.network as string,
        ),
      );
    } else if (params.retail) {
      this.connectedRetail.delete(socket.id);
    } else {
      this.connectedClients.delete(socket.id);
    }
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
        socket.emit(event, {
          wallet,
          network,
          data,
        });
      }
    });
  }

  emitRetail(data: IRetailData, networkParam: WalletNetwork): void {
    for (const { socket, network } of this.connectedRetail.values()) {
      if (network === networkParam) {
        socket.emit('retail', data);
      }
    }
  }

  getTotalExtensionOnline(network: WalletNetwork): number {
    return Array.from(this.connectedExtension.values()).filter(
      (v) => v.network === network.toUpperCase(),
    ).length;
  }

  walletConnected(wallet: string, network: WalletNetwork): boolean {
    return Boolean(
      this.connectedExtension.get(this.getIdSocketExtension(wallet, network)),
    );
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
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Socket;

  constructor(private readonly socketService: SocketService) {}

  handleConnection(socket: Socket): void {
    this.socketService.handleConnection(socket);
  }

  handleDisconnect(socket: Socket): void {
    this.socketService.handleDisconnect(socket);
  }

  // Implement other Socket.IO event handlers and message handlers
}

interface IRetailData {
  hero?: Hero;
  house?: House;
  type: 'sold' | 'listed';
  soldPrice?: number;
  tokenAddress?: string;
  marketPlace: 'opensea' | 'market';
}
