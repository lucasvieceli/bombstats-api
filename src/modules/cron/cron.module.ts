import { CronService } from '@/modules/cron/services/cron.service';
import { UpdatePriceTokens } from '@/modules/cron/use-cases/update-price-tokens';
import { ScheduleModule } from '@nestjs/schedule';

export const CronModules = {
  imports: [ScheduleModule.forRoot()],
  providers: [CronService, UpdatePriceTokens],
};
