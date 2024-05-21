<script lang="ts" setup>
import router from '@/router';
import { useWalletStore } from '@/stores';
import { watchEffect } from 'vue';

const props = defineProps(['chain']);
const walletStore = useWalletStore();

watchEffect(() => {
  if (walletStore && walletStore.currentAddress)
    router.push(`/${props.chain}/user/${walletStore.currentAddress}`);
});
</script>
<template>
  <div class="flex justify-center items-center">
    <label
      v-if="!walletStore?.currentAddress"
      for="PingConnectWallet"
      class="btn btn-sm btn-primary"
    >
      <Icon icon="mdi:wallet" /><span class="ml-1 block">Connect Wallet</span>
    </label>
  </div>
</template>

<route>
    {
      meta: {
        i18n: 'user',
        order: 2
      }
    }
  </route>
