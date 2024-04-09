import { defineStore } from 'pinia';
import { useBlockchain } from './useBlockchain';

export const useValidatorRewardStore = defineStore('validatorRewardStore', {
  state: () => {
    return {
      params: {} as {
        rate: string;
        authority: string;
      },
    };
  },
  getters: {
    blockchain() {
      return useBlockchain();
    },
  },
  actions: {
    async init() {
      this.$reset();      
      return await this.fetchParams();
    },
    async fetchParams() {
      const response = await this.blockchain.rpc?.getValidatorReward();
      if (response?.params) this.params = response.params;
      return this.params;
    },
  },
});
