export enum NetworkType {
  Mainnet,
  Testnet,
}

export function getNetworkType(): NetworkType {
  if (
    window.location.hostname.search('testnet') > -1 ||
    window.location.hostname.search('localhost') > -1
  ) {
    return NetworkType.Testnet;
  }
  return NetworkType.Mainnet;
}

export function handleChainNameToPath(chainName: string): string {
  if (getNetworkType() === NetworkType.Testnet) {
    return chainName.toLocaleLowerCase().replace(' ', '');
  }
  return chainName.toLocaleLowerCase();
}
