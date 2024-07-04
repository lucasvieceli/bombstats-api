import { ABI_HERO } from '@/utils/web3/ABI/hero-abi';
import { ABI_MULTI_CALL } from '@/utils/web3/ABI/multi-call-abi';

import Web3 from 'web3';

export let instancePolygonWeb3: Web3;
export let instanceBscWeb3: Web3;

export function getContractMultiCallPolygon() {
  return new instancePolygonWeb3.eth.Contract(
    ABI_MULTI_CALL,
    '0x7A8F20A0Bf4af6d56FB0Fc1E371987FA41741877',
  );
}

export function getContractMultiCallBsc() {
  return new instanceBscWeb3.eth.Contract(
    ABI_MULTI_CALL,
    '0xb80411Dee1fa1ee98F04FdA761cdDff46e93C7cA',
  );
}

export function getContractHeroPolygon() {
  return new instancePolygonWeb3.eth.Contract(
    ABI_HERO,
    process.env.CONTRACT_HERO_POLYGON,
  );
}

export function getContractHeroBsc() {
  return new instanceBscWeb3.eth.Contract(
    ABI_HERO,
    process.env.CONTRACT_HERO_BSC,
  );
}

export const initializeWeb3 = async () => {
  await initWeb3WithFallback('polygon');
  await initWeb3WithFallback('bsc');

  if (!instancePolygonWeb3 || !instanceBscWeb3) {
    throw new Error('Failed to initialize web3 instances');
  }
};

async function initWeb3WithFallback(network = 'polygon') {
  const rpcUrlsPolygon = [
    'https://rpc.ankr.com/polygon',
    'https://rpc-mainnet.maticvigil.com',
    'https://rpc-mainnet.matic.quiknode.pro',
    'https://polygon-rpc.com',
    'https://rpc-mainnet.matic.network',
    'https://matic-mainnet.chainstacklabs.com',
    'https://matic-mainnet-full-rpc.bwarelabs.com',
    'https://polygon-bor-rpc.publicnode.com',
  ];

  const rpcUrlsBsc = [
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.bnbchain.org',
    'https://bsc-dataseed2.bnbchain.org',
    'https://bsc-dataseed3.bnbchain.org',
    'https://bsc-dataseed4.bnbchain.org',
    'https://bsc-dataseed1.defibit.io',
    'https://bsc-dataseed2.defibit.io',
    'https://bsc-dataseed3.defibit.io',
    'https://bsc-dataseed4.defibit.io',
    'https://bsc-dataseed1.ninicoin.io',
    'https://bsc-dataseed2.ninicoin.io',
    'https://bsc-dataseed3.ninicoin.io',
    'https://bsc-dataseed4.ninicoin.io',
    'https://bsc-rpc.publicnode.com',
  ];

  const rpcUrls = network === 'polygon' ? rpcUrlsPolygon : rpcUrlsBsc;

  for (let i = 0; i < rpcUrls.length; i++) {
    const rpcUrl = rpcUrls[i];
    try {
      const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

      const isConnected = await Promise.race([
        web3.eth.net.isListening(),
        timeout(2000), // Timeout de 2 segundos
      ]);

      console.log('isConnected', isConnected, network);
      if (isConnected) {
        console.log(`Connected to ${rpcUrl}`);
        if (network === 'polygon') {
          instancePolygonWeb3 = web3;
        } else {
          instanceBscWeb3 = web3;
        }
        return;
      } else {
        console.error(`Failed to connect to ${rpcUrl}`);
      }
    } catch (error) {
      console.error(`Error initializing web3 with ${rpcUrl}:`, error);
    }
  }
  throw new Error('All RPC URLs failed ' + network);
}

function timeout(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Request timed out'));
    }, ms);
  });
}
