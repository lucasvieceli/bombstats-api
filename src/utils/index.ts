import { Logger } from '@nestjs/common';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export function chunkArray<T>(array: any[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize) as T[]);
  }
  return chunks;
}

export const executePromisesBlock = async (
  promises: any,
  amount = 10,
  methodFn: any = 'all' || 'allSettled',
  sleepTime = 0,
  log?: string,
) => {
  return new Promise(async (resolve) => {
    let returnPromises: any = [];
    let traveled = 0;
    const division = Math.ceil(promises.length / amount);

    for (let i = 0; i < division; i++) {
      traveled = i * amount;
      if (log) {
        Logger.debug(
          `executing ${amount} promises chunk ${i + 1}/${division}`,
          log,
        );
      }
      const promisesAux = promises
        .slice(traveled, traveled + amount)
        .map(async (p: any) => p());

      let returnPromise;
      if (methodFn === 'all') {
        returnPromise = await Promise.all(promisesAux);
      } else {
        returnPromise = await Promise.allSettled(promisesAux);
      }
      returnPromises = [...returnPromises, ...returnPromise];

      if (sleepTime) {
        await new Promise((resolve) => setTimeout(resolve, sleepTime));
      }
    }
    return resolve(returnPromises);
  });
};

let proxies = [];
// updateProxies();

export async function updateProxies() {
  proxies = [];
  await Promise.all([fetchProxies(), fetchProxiesFromSpysMe()]);
  console.log(`Proxies atualizados: ${proxies.length}`);
}

// setInterval(
//   async () => {
//     updateProxies();
//   },
//   1000 * 60 * 1,
// );

export async function fetchProxies() {
  try {
    const response = await axios.get(
      'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=1000&country=all&ssl=all&anonymity=all',
    );
    const result = response.data.split('\r\n').filter((proxy) => proxy);

    proxies = [...proxies, ...result];
  } catch (error) {
    console.error('Erro ao obter proxies:', error);
    return [];
  }
}

async function fetchProxiesFromSpysMe() {
  try {
    const response = await axios.get('https://spys.me/proxy.txt');
    const newProxies = response.data
      .split('\n')
      .filter((line) => {
        const parts = line.split(' ');
        return (
          parts.length > 1 &&
          parts[0].match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/)
        );
      })
      .map((line) => line.split(' ')[0]);

    proxies = [...proxies, ...newProxies];
  } catch (error) {
    console.error('Erro ao obter proxies do spys.me:', error);
    return [];
  }
}

export function getRandomProxy(proxies) {
  const randomIndex = Math.floor(Math.random() * proxies.length);
  return proxies[randomIndex];
}

export async function makeRequestWithRetry(url, retries = 5) {
  if (proxies.length === 0) {
    console.error('Nenhum proxy disponível.');
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const proxyServerUrl = `http://${getRandomProxy(proxies)}`;
    const axiosInstance = axios.create({
      httpAgent: new HttpsProxyAgent(proxyServerUrl),
    });

    try {
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.warn(
          `Erro 429 na tentativa ${attempt}, tentando novamente com um novo proxy...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Aguarda 1 segundo antes de tentar novamente
      } else {
        console.error(`Erro na tentativa ${attempt}:`, error.message);
        throw error;
      }
    }
  }

  console.error('Todas as tentativas falharam.');
  throw new Error('Erro 429: Todas as tentativas falharam.');
}
