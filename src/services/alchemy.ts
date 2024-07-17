import { WalletNetwork } from '@/database/models/Wallet';
import { decodeInputBuy, decodeInputCreateOrder } from '@/utils/web3/market';
import { getRpcWeb3 } from '@/utils/web3/web3';
import { Injectable } from '@nestjs/common';
import { Alchemy, Network } from 'alchemy-sdk';
import Web3 from 'web3';

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

    // this.initHeroPolygon();
    // this.initHousePolygon();
    this.initHeroBsc();
    // this.initHouseBsc();
    // console.log(
    //   decodeInputBuy(
    //     '0xd6febde80000000000000000000000000000000000000000000000000000000000352dfb000000000000000000000000000000000000000000000002b5e3af16b1880000',
    //   ),
    // );
    // console.log(
    //   decodeInputCreateOrder(
    //     '0x23b70d7600000000000000000000000000000000000000000000000000000000014518c6000000000000000000000000000000000000000000000069704c1af2c6c4000000000000000000000000000000e1656e45f18ec6747f5a8496fd39b50b38396d',
    //   ),
    // );
    //
  }

  initHeroPolygon() {
    this.alchemyPolygon.ws.on(
      {
        method: 'alchemy_minedTransactions',
      },
      (res) => {
        if (res.from == process.env.CONTRACT_HERO_MARKET_POLYGON!) {
          if (res.transaction.input.startsWith('0x23b70d76')) {
            console.log('hero listed ', res);
          } else if (res.transaction.input.startsWith('0xd6febde8')) {
            console.log('hero sold ', res);
          }
        } else if (res.from == process.env.CONTRACT_HOUSE_MARKET_POLYGON!) {
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
  async initHeroBsc() {
    // const webSocketURL = 'wss://bsc-rpc.publicnode.com';
    // const web3 = new Web3(new Web3.providers.WebsocketProvider(webSocketURL));

    // web3.eth.net
    //   .isListening()
    //   .then(() => console.log('WebSocket is connected and listening bsc'))
    //   .catch((e) => console.log(' bsc Something went wrong:', e));

    // const subscription = await web3.eth.subscribe('logs', {
    //   address: [
    //     '0x376A10E7f125A4E0a567cc08043c695Cd8EDd704'.toLowerCase(), //hero
    //     '0x049896f350C802CD5C91134E5f35Ec55FA8f0108'.toLowerCase(), //house
    //     '0x053282c295419e67655a5032a4da4e3f92d11f17'.toLowerCase(), //stake
    //   ],
    //   // topics: [],
    // });

    // subscription.on('data', async (log) => {
    //   console.log('data', log);
    //   const rpc = getRpcWeb3(WalletNetwork.BSC);
    //   const result = await rpc.eth.getTransaction(log.transactionHash);
    //   console.log('result hero', result);
    // });

    // async function testPolygon() {
    //   const webSocketURL = 'wss://polygon.drpc.org';
    //   const web3 = new Web3(new Web3.providers.WebsocketProvider(webSocketURL));
    //   web3.eth.net
    //     .isListening()
    //     .then(() => console.log('WebSocket is connected and listening polygon'))
    //     .catch((e) => console.log(' polygon Something went wrong:', e));

    //   const subscription = await web3.eth.subscribe('logs', {
    //     address: [
    //       '0xf3a7195920519f8a22cdf84ebb9f74342abe9812'.toLowerCase(), //hero
    //       '0xBb5966daF83ec4D3f168671a464EB18430EeA3be'.toLowerCase(), //house
    //       '0x810570aa7e16cf14defd69d4c9796f3c1abe2d13'.toLowerCase(), //stake
    //     ],
    //     // topics: [],
    //   });
    //   subscription.on('connected', (subscriptionId) => {
    //     console.log('Subscription connected with ID:', subscriptionId);
    //   });
    //   subscription.on('data', async (log) => {
    //     console.log('data polygon', log);
    //     const rpc = getRpcWeb3(WalletNetwork.BSC);
    //     const result = await rpc.eth.getTransaction(log.transactionHash);
    //     console.log('result hero polygon ', result);
    //   });
    // }
    // testPolygon();

    async function listenToNewBlocks() {
      const webSocketURL = 'wss://polygon.drpc.org';
      const web3 = new Web3(new Web3.providers.WebsocketProvider(webSocketURL));

      try {
        const subscription = await web3.eth.subscribe('newBlockHeaders');

        subscription.on('data', async (blockHeader) => {
          // console.log('New block header:', blockHeader);
          try {
            const block = await web3.eth.getBlock(blockHeader.hash, true);
            if (block && block.transactions) {
              for (const tx of block.transactions as any) {
                // console.log('Transaction in new block:', tx);
                // Verifique se a transação é relevante para você
                const addresses = [
                  '0xf3a7195920519f8a22cdf84ebb9f74342abe9812'.toLowerCase(),
                  '0xBb5966daF83ec4D3f168671a464EB18430EeA3be'.toLowerCase(),
                  '0x810570aa7e16cf14defd69d4c9796f3c1abe2d13'.toLowerCase(),
                ];
                // console.log(tx.to.toLowerCase());
                if (addresses.includes(tx.to?.toLowerCase())) {
                  console.log('Relevant transaction:', tx);
                }
              }
            }
          } catch (error) {
            console.error('Error fetching block details:', error);
          }
        });

        subscription.on('error', (error) => {
          console.error('Subscription error:', error);
        });
      } catch (error) {
        console.error('Error setting up subscription:', error);
      }
    }

    async function listenToNewBlocksBsc() {
      const webSocketURL = 'wss://bsc-rpc.publicnode.com';
      const web3 = new Web3(new Web3.providers.WebsocketProvider(webSocketURL));

      try {
        const subscription = await web3.eth.subscribe('newBlockHeaders');

        subscription.on('data', async (blockHeader) => {
          // console.log('New block header:', blockHeader);
          try {
            const block = await web3.eth.getBlock(blockHeader.hash, true);
            if (block && block.transactions) {
              for (const tx of block.transactions as any) {
                // console.log('Transaction in new block:', tx);
                // Verifique se a transação é relevante para você
                const addresses = [
                  '0x376A10E7f125A4E0a567cc08043c695Cd8EDd704'.toLowerCase(), //hero
                  '0x049896f350C802CD5C91134E5f35Ec55FA8f0108'.toLowerCase(), //house
                  '0x053282c295419e67655a5032a4da4e3f92d11f17'.toLowerCase(), //stake
                ];
                // console.log(tx.to.toLowerCase());
                if (addresses.includes(tx.to?.toLowerCase())) {
                  console.log('Relevant transaction: bscc   ', tx);
                }
              }
            }
          } catch (error) {
            console.error('Error fetching block details: ', error);
          }
        });

        subscription.on('error', (error) => {
          console.error('Subscription error:', error);
        });
      } catch (error) {
        console.error('Error setting up subscription:', error);
      }
    }

    // listenToNewBlocksBsc();
    // listenToNewBlocks();

    // const subscription1 = await web3.eth.subscribe('logs', {
    //   address: '0x049896f350C802CD5C91134E5f35Ec55FA8f0108'.toLowerCase(),
    //   topics: [],
    // });

    // subscription1.on('data', async (log) => {
    //   console.log('data house', log);
    //   const rpc = getRpcWeb3(WalletNetwork.BSC);
    //   const result = await rpc.eth.getTransaction(log.transactionHash);
    //   console.log('result house', result);
    // });
    // const web31 = new Web3(new Web3.providers.WebsocketProvider(webSocketURL));
    // const subscriptionStake = await web31.eth.subscribe('logs', {
    //   address: '0x053282c295419e67655a5032a4da4e3f92d11f17',
    //   topics: [],
    // });

    // subscriptionStake.on('data', async (log) => {
    //   console.log('data stake', log);
    //   const rpc = getRpcWeb3(WalletNetwork.BSC);
    //   const result = await rpc.eth.getTransaction(log.transactionHash);
    //   console.log('result subscriptionStake', result);
    // });

    // this.alchemyBsc.ws.on(
    //   {
    //     method: 'alchemy_minedTransactions',
    //     fromAddress: '0x376A10E7f125A4E0a567cc08043c695Cd8EDd704',
    //   },
    //   (res) => {
    //     if (res.transaction.input.startsWith('0x23b70d76')) {
    //       console.log('hero listed  bsc', res);
    //     } else if (res.transaction.input.startsWith('0xd6febde8')) {
    //       console.log('hero sold  bsc', res);
    //     }
    //   },
    // );
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
