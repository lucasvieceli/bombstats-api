import { WalletNetwork } from '@/database/models/Wallet';
import { DecodeSmartFox } from '@/modules/extension/use-cases/decode-smartfox';
import { OnConnect } from '@/modules/extension/use-cases/on-connect';
import { OnDisconnect } from '@/modules/extension/use-cases/on-disconnect';
import { OnGetMapBlock } from '@/modules/extension/use-cases/on-get-block-map';
import { OnStartExplodeV4 } from '@/modules/extension/use-cases/on-start-explode-v4';
import { OnStartPve } from '@/modules/extension/use-cases/on-start-pve';
import { OnStopPve } from '@/modules/extension/use-cases/on-stop-pve';
import { Body, Controller, Post } from '@nestjs/common';

export interface IBodyExtensionPost {
  wallet: string;
  network: WalletNetwork;
  message: string;
  additional?: any;
}

@Controller('extension')
export class ExtensionController {
  constructor(
    private decodeSmartFox: DecodeSmartFox,
    private onGetMapBlock: OnGetMapBlock,
    private onStartPve: OnStartPve,
    private onConnect: OnConnect,
    private onDisconnect: OnDisconnect,
    private onStopPve: OnStopPve,
    private onStartExplodeV4: OnStartExplodeV4,
  ) {}

  @Post()
  async extension(
    @Body()
    { wallet, network, message, additional }: IBodyExtensionPost,
  ) {
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
    }
    if (['Q09OTkVDVEVE', 'Q0xPU0VE'].includes(message)) return;

    const dataHolder = await this.decodeSmartFox.execute(message);

    const ec = dataHolder.get('c').value; // Valor 'GET_SKIN_INVENTORY'
    console.log('ec', ec);
    const value = dataHolder.get('p').value;
    switch (ec) {
      case 'GET_BLOCK_MAP':
        this.onGetMapBlock.execute({
          wallet,
          network,
          value,
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
        this.onStartExplodeV4.execute({
          wallet,
          network,
          value,
        });
        break;
    }
  }
}
