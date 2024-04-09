import { getNetworkType, NetworkType } from '@/libs/network';
import { useBlockchain } from '@/stores';
import { createRouter, createWebHistory } from 'vue-router';
// @ts-ignore
import { setupLayouts } from 'virtual:generated-layouts';
// @ts-ignore
import routes from '~pages';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect:
        getNetworkType() === NetworkType.Testnet
          ? '/Titan%20Testnet'
          : '/Titan',
    },
    {
      path:
        getNetworkType() === NetworkType.Testnet
          ? '/Titan%20Testnet/address'
          : '/Titan/address',
      redirect:
        getNetworkType() === NetworkType.Testnet
          ? '/Titan%20Testnet/account'
          : '/Titan/account',
    },
    {
      path:
        getNetworkType() === NetworkType.Testnet
          ? '/Titan%20Testnet/address/:id'
          : '/Titan/address/:id',
      redirect: (to) => {
        return {
          path:
            getNetworkType() === NetworkType.Testnet
              ? `/Titan%20Testnet/account/${to.params.id}`
              : `/Titan/account/${to.params.id}`,
        };
      },
    },
    ...setupLayouts(routes),
  ],
});

//update current blockchain
router.beforeEach((to) => {
  const { chain } = to.params;
  if (chain) {
    const blockchain = useBlockchain();
    if (chain !== blockchain.chainName) {
      blockchain.setCurrent(chain.toString());
    }
  }
});

// Docs: https://router.vuejs.org/guide/advanced/navigation-guards.html#global-before-guards

export default router;
