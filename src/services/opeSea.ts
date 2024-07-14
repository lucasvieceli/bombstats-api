import { Injectable } from '@nestjs/common';
import { Network, OpenSeaStreamClient } from '@opensea/stream-js';
import { WebSocket } from 'ws';

const API_KEY = 'e05f9f908e7b4722a7bc6e36c3ffc8b0';

@Injectable()
export class OpenSeayService {
  client;
  constructor() {
    this.client = new OpenSeaStreamClient({
      token: API_KEY!,
      connectOptions: {
        transport: WebSocket,
      },
      network: Network.MAINNET,
    });
    this.client.connect();
    this.client.onItemListed('bomber-hero-polygon', () => {
      console.log('hero listed polygon');
    });
    this.client.onItemSold('bomber-hero-polygon', () =>
      console.log('hero sold polygon'),
    );
    this.client.onItemListed('bomber-house', () =>
      console.log('house listed polygon'),
    );
    this.client.onItemSold('bomber-house', () =>
      console.log('house sold polygon'),
    );
  }
}
