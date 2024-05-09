import { defineStore } from 'pinia';

import ChainRegistryClientTitan from '@/libs/ChainRegistryClientTitan';
import { handleChainNameToPath } from '@/libs/network';
import router from '@/router';
import { useBlockchain } from '@/stores';
import type {
  IBCInfo,
  IBCPath,
} from '@ping-pub/chain-registry-client/dist/types';

export const useIBCModule = defineStore('module-ibc', {
  state: () => {
    return {
      paths: [] as IBCPath[],
      connectionId: '' as string,
      registryConf: {} as IBCInfo,
    };
  },
  getters: {
    chain() {
      return useBlockchain();
    },
    commonIBCs(): any {
      const handleChangeChainNameToPath: string = handleChainNameToPath(
        this.chain.current?.prettyName || this.chain.chainName
      );

      return this.paths.filter(
        (x: IBCPath) => x.path.search(handleChangeChainNameToPath) > -1
      );
    },
    sourceField(): string {
      const handleChangeChainNameToPath: string = handleChainNameToPath(
        this.chain.current?.prettyName || this.chain.chainName
      );
      return this.registryConf?.chain_1?.chain_name ===
        handleChangeChainNameToPath
        ? 'chain_1'
        : 'chain_2';
    },
    destField(): string {
      return this.registryConf?.chain_1?.chain_name ===
        this.chain.current?.prettyName || this.chain.chainName
        ? 'chain_2'
        : 'chain_1';
    },
    registryChannels(): any {
      return this.registryConf.channels;
    },
  },
  actions: {
    load() {
      const client = new ChainRegistryClientTitan();
      client.fetchDynamicIBCPaths().then((res) => {
        this.paths = res;
      });
    },
    async getConnectionId(path: string) {
      const client = new ChainRegistryClientTitan();
      const handleChangeChainNameToPath: string = handleChainNameToPath(
        this.chain.current?.prettyName || this.chain.chainName
      );
      let connId: string = '';

      const res = await client.fetchDynamicIBCPathInfo(path);

      connId =
        res.chain_1.chain_name === handleChangeChainNameToPath
          ? res.chain_1.connection_id
          : res.chain_2.connection_id;
      this.connectionId = connId;

      return connId;
    },
    fetchConnection(path: string) {
      const client = new ChainRegistryClientTitan();
      const handleChangeChainNameToPath: string = handleChainNameToPath(
        this.chain.current?.prettyName || this.chain.chainName
      );

      client.fetchDynamicIBCPathInfo(path).then((res) => {
        const connId =
          res.chain_1.chain_name === handleChangeChainNameToPath
            ? res.chain_1.connection_id
            : res.chain_2.connection_id;
        this.registryConf = res;
        this.showConnection(connId);
      });
    },
    showConnection(connId?: string | number) {
      if (!connId) {
        this.registryConf = {} as any;
      }
      const path = `/${this.chain.chainName}/ibc/connection/${
        connId || `connection-${this.connectionId || 0}`
      }`;
      router.push(path);
    },
  },
});
