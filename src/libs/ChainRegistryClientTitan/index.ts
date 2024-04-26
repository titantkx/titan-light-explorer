import ChainRegistryClient from '@ping-pub/chain-registry-client';
import type {
  Entry,
  IBCPath,
  IBCPathInfo,
} from '@ping-pub/chain-registry-client/dist/types';
import { getNetworkType, NetworkType } from '../network';

export default class ChainRegistryClientTitan extends ChainRegistryClient {
  constructor() {
    super();
  }

  async fetchDynamicIBCPaths() {
    const entries = await this.get<Entry[]>(
      getNetworkType() === NetworkType.Testnet ? `/testnets/_IBC/` : `/_IBC/`
    );
    const re = /([\w]+)-([\w]+)\.json/;
    return entries.map((x) => {
      const matches: any = x.name.match(re);
      const bridge = {} as IBCPath;
      bridge.path = x.name;
      bridge.from = matches[1];
      bridge.to = matches[2];
      return bridge;
    });
  }

  async fetchDynamicIBCPathInfo(path: string) {
    const info = await this.get<IBCPathInfo>(
      getNetworkType() === NetworkType.Testnet
        ? `/testnets/_IBC/${path}`
        : `/_IBC/${path}`
    );
    return info;
  }
}
