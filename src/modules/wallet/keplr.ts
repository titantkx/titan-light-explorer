import type { ChainInfo, Window as KeplrWindow } from '@keplr-wallet/types';

declare global {
  interface Window extends KeplrWindow {}
}

export async function addTitanChain(chainInfo: ChainInfo) {
  const { keplr } = window;
  if (!keplr) {
    alert('You need to install Keplr');
    throw new Error('You need to install Keplr');
  }
  await keplr.experimentalSuggestChain(chainInfo);
  await keplr.enable(chainInfo.chainId);
}
