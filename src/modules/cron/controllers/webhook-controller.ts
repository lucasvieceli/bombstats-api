import { InjectQueue } from '@nestjs/bullmq';
import { Body, Controller, Post } from '@nestjs/common';
import { Queue } from 'bullmq';

@Controller('/webhook')
export class WebhookController {
  constructor(
    @InjectQueue('webhook-quicknode')
    private readonly onWebhookQuicknode: Queue,
  ) {}

  @Post('quicknode')
  async quicknode(@Body() body: any) {
    setTimeout(() => {
      this.onWebhookQuicknode.add('webhook-quicknode', body);
    }, 5000);
  }
}
