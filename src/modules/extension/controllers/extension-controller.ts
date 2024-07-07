import { WalletNetwork } from '@/database/models/Wallet';
import { GetDashboard } from '@/modules/extension/use-cases/get-dashboard';
import { SocketService } from '@/services/websocket';
import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get, Param } from '@nestjs/common';
import { Queue } from 'bullmq';

export interface IBodyExtensionPost {
  wallet: string;
  network: WalletNetwork;
  message: string;
  additional?: any;
}

@Controller('extension')
export class ExtensionController {
  constructor(
    private getDashboard: GetDashboard,
    private socketService: SocketService,
    @InjectQueue('extension-message') private readonly extensionMessage: Queue,
  ) {
    this.socketService.addEventListeners('extension', (params) =>
      // this.onMessageExtension.execute(params),
      this.extensionMessage.add('extensionMessage', params),
    );
  }
  @Get('dashboard/:network')
  async dashboard(@Param('network') network: WalletNetwork) {
    return await this.getDashboard.execute({
      network: network.toLowerCase() as WalletNetwork,
    });
  }

  // @Post()
  // async extension(
  //   @Body()
  //   { network, wallet: walletParam, message, additional }: IBodyExtensionPost,
  // ) {
  //   const wallet = walletParam.toLowerCase();
  //   if (!Object.values(WalletNetwork).includes(network)) return;

  //   switch (message) {
  //     //connected
  //     case 'Q09OTkVDVEVE':
  //       this.onConnect.execute({
  //         wallet,
  //         network,
  //       });
  //       break;

  //     //disconnected
  //     case 'Q0xPU0VE':
  //       this.onDisconnect.execute({
  //         wallet,
  //         network,
  //       });
  //       break;
  //   }
  //   if (['Q09OTkVDVEVE', 'Q0xPU0VE'].includes(message)) return;

  //   const dataHolder = await this.decodeSmartFox.execute(message);

  //   const ec = dataHolder.get('c').value; // Valor 'GET_SKIN_INVENTORY'
  //   const value = dataHolder.get('p').value;
  //   switch (ec) {
  //     case 'GET_BLOCK_MAP':
  //       this.onGetMapBlock.execute({
  //         wallet,
  //         network,
  //         value,
  //         additional,
  //       });
  //       break;
  //     case 'START_PVE':
  //       this.onStartPve.execute({
  //         wallet,
  //         network,
  //       });
  //       break;
  //     case 'STOP_PVE':
  //       this.onStopPve.execute({
  //         wallet,
  //         network,
  //       });
  //       break;
  //     case 'START_EXPLODE_V4':
  //       this.onStartExplodeV4.execute({
  //         wallet,
  //         network,
  //         value,
  //       });
  //       break;
  //   }
  // }
}
