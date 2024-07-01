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
      console.log(
        `${log} executing ${amount} promises chunk ${i + 1}/${division}`,
      );
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
