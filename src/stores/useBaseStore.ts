import { hashTx } from '@/libs';
import { useBlockchain } from '@/stores';
import type { Block } from '@/types';
import { fromBase64 } from '@cosmjs/encoding';
import { decodeTxRaw, type DecodedTxRaw } from '@cosmjs/proto-signing';
import dayjs from 'dayjs';
import { defineStore } from 'pinia';

export const useBaseStore = defineStore('baseStore', {
  state: () => {
    return {
      earlest: {} as Block,
      latest: {} as Block,
      recents: [] as Block[],
      fetched: new Uint8Array(1),
      theme: (window.localStorage.getItem('theme') || 'dark') as
        | 'light'
        | 'dark',
    };
  },
  getters: {
    blocktime(): number {
      if (this.earlest && this.latest) {
        if (
          this.latest.block?.header?.height !==
          this.earlest.block?.header?.height
        ) {
          const diff = dayjs(this.latest.block?.header?.time).diff(
            this.earlest.block?.header?.time
          );
          const blocks =
            Number(this.latest.block.header.height) -
            Number(this.earlest.block.header.height);
          return diff / blocks;
        }
      }
      return 6000;
    },
    blockchain() {
      return useBlockchain();
    },
    currentChainId(): string {
      return this.latest.block?.header.chain_id || '';
    },
    txsInRecents() {
      const txs = [] as {
        height: string;
        hash: string;
        tx: DecodedTxRaw;
      }[];
      this.recents.forEach((b) =>
        b.block?.data?.txs.forEach((tx: string) => {
          if (tx) {
            const raw = fromBase64(tx);
            try {
              txs.push({
                height: b.block.header.height,
                hash: hashTx(raw),
                tx: decodeTxRaw(raw),
              });
            } catch (e) {
              console.error(e);
            }
          }
        })
      );
      return txs.sort((a, b) => {
        return Number(b.height) - Number(a.height);
      });
    },
  },
  actions: {
    async initial() {
      this.autoFetchLatest();
    },
    async clearRecentBlocks() {
      this.recents = [];
    },
    async autoFetchLatest() {
      if (Atomics.compareExchange(this.fetched, 0, 0, 1)) {
        return;
      }
      while (true) {
        let interval = 1000;
        try {
          await this.fetchLatest();
          if (this.recents.length > 1) {
            interval =
              Date.parse(this.recents.at(-1)!.block.header.time) -
              Date.parse(this.recents.at(-2)!.block.header.time);
          }
        } catch (e) {
          console.log(e);
        }
        await new Promise((f) => setTimeout(f, interval));
      }
    },
    appendBlock(block: Block) {
      if (this.recents.length >= 50) {
        this.recents.shift();
      }
      this.recents.push(block);
      this.latest = block;
      this.earlest = this.recents[0];
    },
    async fetchLatest() {
      const latest = await this.blockchain.rpc?.getBaseBlockLatest();
      if (!this.latest.block) {
        this.appendBlock(latest);
        return latest;
      }
      const currentHeight = Number(this.latest.block.header.height);
      const latestHeight = Number(latest.block.header.height);
      if (latestHeight <= currentHeight) {
        return this.latest;
      }
      for (let height = currentHeight + 1; height < latestHeight; height++) {
        const block = await this.blockchain.rpc?.getBaseBlockAt(height);
        this.appendBlock(block);
      }
      this.appendBlock(latest);
      return latest;
    },

    async fetchValidatorByHeight(height?: number, offset = 0) {
      return this.blockchain.rpc.getBaseValidatorsetAt(String(height), offset);
    },
    async fetchLatestValidators(offset = 0) {
      return this.blockchain.rpc.getBaseValidatorsetLatest(offset);
    },
    async fetchBlock(height?: number | string) {
      return this.blockchain.rpc.getBaseBlockAt(String(height));
    },
    async fetchAbciInfo() {
      return this.blockchain.rpc.getBaseNodeInfo();
    },
    // async fetchNodeInfo() {
    //     return this.blockchain.rpc.no()
    // }
  },
});
