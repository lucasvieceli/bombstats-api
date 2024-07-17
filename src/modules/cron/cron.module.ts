import { WebhookController } from '@/modules/cron/controllers/webhook-controller';
import { CronEveryHour } from '@/modules/cron/services/con-every-hour.service';
import { CronService } from '@/modules/cron/services/cron.service';
import { OnWebhookQuicknode } from '@/modules/cron/use-cases/on-webhook-quicknode';
import { UpdateOpenSea } from '@/modules/cron/use-cases/update-open-sea';
import { UpdatePriceTokens } from '@/modules/cron/use-cases/update-price-tokens';
import { ScheduleModule } from '@nestjs/schedule';

export const CronModules = {
  imports: [ScheduleModule.forRoot()],
  controllers: [WebhookController],
  providers: [
    CronService,
    UpdatePriceTokens,
    CronEveryHour,
    UpdateOpenSea,
    OnWebhookQuicknode,
  ],
};
