import { WalletNetwork } from '@/database/models/Wallet';
import { OnConnect } from '@/modules/extension/use-cases/on-connect';
import { OnDisconnect } from '@/modules/extension/use-cases/on-disconnect';
import { OnGetMapBlock } from '@/modules/extension/use-cases/on-get-block-map';
import { OnStartExplodeV4 } from '@/modules/extension/use-cases/on-start-explode-v4';
import { OnStartPve } from '@/modules/extension/use-cases/on-start-pve';
import { OnStopPve } from '@/modules/extension/use-cases/on-stop-pve';
import { SocketService } from '@/services/websocket';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

interface IOnMessageExtension {
  wallet: string;
  network: WalletNetwork;
  message: string;
  additional?: any;
}

@Processor('extension-message', { concurrency: 10000 })
export class OnMessageExtension extends WorkerHost {
  constructor(
    private onGetMapBlock: OnGetMapBlock,
    private onStartPve: OnStartPve,
    private onConnect: OnConnect,
    private onDisconnect: OnDisconnect,
    private onStopPve: OnStopPve,
    private onStartExplodeV4: OnStartExplodeV4,
    private socketService: SocketService,
  ) {
    super();
  }

  async process(job: Job<IOnMessageExtension>): Promise<any> {
    const { network, wallet: walletParam, message, additional } = job.data;
    const wallet = walletParam.toLowerCase();
    if (!Object.values(WalletNetwork).includes(network)) return;

    switch (message) {
      //connected
      case 'Q09OTkVDVEVE':
        this.onConnect.execute({
          wallet,
          network,
        });
        break;

      //disconnected
      case 'Q0xPU0VE':
        this.onDisconnect.execute({
          wallet,
          network,
        });
        break;
      case 'GO_SLEEP':
      case 'GO_HOME':
      case 'GO_WORK':
      case 'ACTIVE_BOMBER':
      case 'GET_ACTIVE_BOMBER':
      case 'CHANGE_BBM_STAGE':
      case 'SYNC_BOMBERMAN':
        this.socketService.emitEventWallet(
          message,
          wallet,
          network,
          additional,
        );
        break;

      case 'GET_BLOCK_MAP':
        this.onGetMapBlock.executeV2({
          wallet,
          network,
          additional,
        });
        break;
      case 'START_PVE':
        this.onStartPve.execute({
          wallet,
          network,
        });
        break;
      case 'STOP_PVE':
        this.onStopPve.execute({
          wallet,
          network,
        });
        break;
      case 'START_EXPLODE_V4':
        this.onStartExplodeV4.executeV2({
          wallet,
          network,
          additional,
        });
        break;
    }
  }
}
