import { Injectable } from '@nestjs/common';
import { SmartFox } from 'sfs2x-api';

type SmartFoxExtended = SmartFox & {
  _socketEngine: {
    _protocolCodec: {
      onPacketRead: (message: Buffer) => { dump: () => string };
    };
  };
};
const SFS = new SmartFox({
  host: 'sv-game-0.bombcrypto.io',
  port: 8443,
  zone: 'BomberGameZone',
  debug: false,
  useSSL: true,
}) as SmartFoxExtended;

@Injectable()
export class DecodeSmartFox {
  async execute(base64: string) {
    const binMessage = Buffer.from(base64, 'base64');
    const parsed = SFS!._socketEngine._protocolCodec.onPacketRead(
      binMessage,
    ) as any;

    return parsed._content._dataHolder;
  }
}
