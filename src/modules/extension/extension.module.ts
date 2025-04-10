import { ExtensionController } from '@/modules/extension/controllers/extension-controller';
import { GetDashboard } from '@/modules/extension/use-cases/get-dashboard';
import { OnConnect } from '@/modules/extension/use-cases/on-connect';
import { OnDisconnect } from '@/modules/extension/use-cases/on-disconnect';
import { OnGetMapBlock } from '@/modules/extension/use-cases/on-get-block-map';
import { OnMessageExtension } from '@/modules/extension/use-cases/on-message-extension';
import { OnStartExplodeV4 } from '@/modules/extension/use-cases/on-start-explode-v4';
import { OnStartPve } from '@/modules/extension/use-cases/on-start-pve';
import { OnStopPve } from '@/modules/extension/use-cases/on-stop-pve';

export const ExtensionModules = {
  imports: [],
  controllers: [ExtensionController],
  providers: [
    OnGetMapBlock,
    OnStartPve,
    OnConnect,
    OnDisconnect,
    OnStopPve,
    OnStartExplodeV4,
    GetDashboard,
    OnMessageExtension,
  ],
};
