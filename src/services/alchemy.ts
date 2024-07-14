import { WalletNetwork } from '@/database/models/Wallet';
import { decodeInputBuy, decodeInputCreateOrder } from '@/utils/web3/market';
import { getRpcWeb3 } from '@/utils/web3/web3';
import { Injectable } from '@nestjs/common';
import { Alchemy, Network } from 'alchemy-sdk';

const API_KEY = 'pzsLRswzMnK9ypieNJ7MeuwEcoaol6aB';

@Injectable()
export class AlchemyService {
  alchemyPolygon;
  alchemyBsc;

  constructor() {
    this.alchemyPolygon = new Alchemy({
      apiKey: API_KEY,
      network: Network.MATIC_MAINNET,
    });
    this.alchemyBsc = new Alchemy({
      apiKey: API_KEY,
      network: Network.ETH_MAINNET,
    });
    console.log('iniciou');

    this.initHeroPolygon();
    // this.initHousePolygon();
    this.initHeroBsc();
    this.initHouseBsc();
    console.log(
      decodeInputBuy(
        '0xd6febde80000000000000000000000000000000000000000000000000000000000352dfb000000000000000000000000000000000000000000000002b5e3af16b1880000',
      ),
    );
    console.log(
      decodeInputBuy(
        '0xd6febde80000000000000000000000000000000000000000000000000000000000352dfb000000000000000000000000000000000000000000000002b5e3af16b1880000',
      ),
    );
    //
  }

  initHeroPolygon() {
    this.alchemyPolygon.ws.on(
      {
        method: 'alchemy_minedTransactions',
        fromAddress: '0xf3a7195920519f8a22cdf84ebb9f74342abe9812',
      },
      (res) => {
        if (res.from == '0xf3a7195920519f8a22cdf84ebb9f74342abe9812') {
          if (res.transaction.input.startsWith('0x23b70d76')) {
            console.log('hero listed ', res);
          } else if (res.transaction.input.startsWith('0xd6febde8')) {
            console.log('hero sold ', res);
          }
        } else if (res.from == '0xBb5966daF83ec4D3f168671a464EB18430EeA3be') {
          if (res.transaction.input.startsWith('0x23b70d76')) {
            console.log('house listed ', res);
          } else if (res.transaction.input.startsWith('0xd6febde8')) {
            console.log('house sold ', res);
          }
        }
      },
    );
  }
  // initHousePolygon() {
  //   this.alchemyPolygon.ws.on(
  //     {
  //       method: 'alchemy_minedTransactions',
  //       fromAddress: '0xBb5966daF83ec4D3f168671a464EB18430EeA3be',
  //     },
  //     (res) => {
  //       if (res.transaction.input.startsWith('0x23b70d76')) {
  //         console.log('house listed ', res);
  //       } else if (res.transaction.input.startsWith('0xd6febde8')) {
  //         console.log('house sold ', res);
  //       }
  //     },
  //   );
  // }
  initHeroBsc() {
    this.alchemyBsc.ws.on(
      {
        method: 'alchemy_minedTransactions',
        fromAddress: '0x376A10E7f125A4E0a567cc08043c695Cd8EDd704',
      },
      (res) => {
        if (res.transaction.input.startsWith('0x23b70d76')) {
          console.log('hero listed  bsc', res);
        } else if (res.transaction.input.startsWith('0xd6febde8')) {
          console.log('hero sold  bsc', res);
        }
      },
    );
  }
  initHouseBsc() {
    this.alchemyBsc.ws.on(
      {
        method: 'alchemy_minedTransactions',
        fromAddress: '0x049896f350C802CD5C91134E5f35Ec55FA8f0108',
      },
      (res) => {
        if (res.transaction.input.startsWith('0x23b70d76')) {
          console.log('house listed  bsc', res);
        } else if (res.transaction.input.startsWith('0xd6febde8')) {
          console.log('house sold  bsc', res);
        }
      },
    );
  }
}
