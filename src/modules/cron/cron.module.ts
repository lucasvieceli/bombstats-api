import { CronService } from '@/modules/cron/services/cron.service';
import { ScheduleModule } from '@nestjs/schedule';

export const CronModules = {
  imports: [ScheduleModule.forRoot()],
  providers: [CronService],
};
