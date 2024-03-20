<script setup lang="ts">
import { CosmosRestClient } from '@/libs/client';
import { ERROR_MESSAGE, initListWallet } from '@/libs/wallet/constants';
import {
  createWallet,
  extractChainId,
  readWallet,
  WalletName,
  writeWallet,
  type Account,
  type ConnectedWallet,
} from '@/libs/wallet/Wallet';
import {
  useBaseStore,
  useBlockchain,
  useDashboard,
  useWalletStore,
  type ChainConfig,
} from '@/stores';
import { Icon } from '@iconify/vue';
import { computed, onMounted, ref } from 'vue';

const walletStore = useWalletStore();
const chainStore = useBlockchain();
const baseStore = useBaseStore();
const dashboard = useDashboard();

let showCopyToast = ref(0);
const open = ref(false);
const openAddChain = ref(false);
const error = ref('');
const conf = ref('');
const sending = ref(false);
const name = ref(WalletName.Leap);
const connected = ref(readWallet(chainStore?.defaultHDPath) as ConnectedWallet);
const selected = ref({} as ChainConfig);

onMounted(() => {
  const chainStore = useBlockchain();
  selected.value = chainStore.current || Object.values(dashboard.chains)[0];
  initParamsForLeap();
});

async function walletStateChange(res: any) {
  walletStore.setConnectedWallet(res?.value);

  if (name.value === WalletName.Metamask) {
    const param: any = JSON.parse(conf.value);
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: param?.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [param],
          });
        } catch (addError) {
          // handle "add" error
        }
      }
      // handle other "switch" errors
    }
  }
  walletStore.loadMyAsset();
}

function selectWallet(wallet: WalletName) {
  name.value = wallet;
  if (wallet === WalletName.Keplr) {
    initParamsForKeplr();
    return;
  }
  if (wallet === WalletName.Leap) {
    initParamsForLeap();
    return;
  }
  if (wallet === WalletName.Metamask) {
    initForMetamask();
    return;
  }
}

async function initData() {}

async function checkWalletBeforeConnect() {
  if (name.value === WalletName.Keplr) {
    if (!window.keplr) {
      return window.open('https://www.keplr.app/download');
    }
  }

  if (name.value === WalletName.Metamask) {
    if (!(window as any).ethereum) {
      return window.open(
        'https://metamask.app.link/dapp/titan-testnet-explorer-light.titanlab.io'
      );
    }
  }

  if (name.value === WalletName.Leap) {
    if (!(window as any).leap) {
      return window.open(
        'https://leapcosmoswallet.page.link/Dv7TgMJQDGatW47F8'
      );
    }
  }
}

async function initParamsForKeplr() {
  const chain = selected.value;
  if (!chain.endpoints?.rest?.at(0))
    throw new Error(ERROR_MESSAGE.ENDPOINT_NOT_SET);
  const client = CosmosRestClient.newDefault(
    chain.endpoints.rest?.at(0)?.address || ''
  );
  const b = await client.getBaseBlockLatest();
  const chainid = b.block.header.chain_id;

  const gasPriceStep = chain.keplrPriceStep || {
    low: 0.01,
    average: 0.025,
    high: 0.03,
  };
  const coinDecimals =
    chain.assets[0].denom_units.find(
      (x) => x.denom === chain.assets[0].symbol.toLowerCase()
    )?.exponent || 6;
  conf.value = JSON.stringify(
    {
      chainId: chainid,
      chainName: chain.chainName,
      rpc: chain.endpoints?.rpc?.at(0)?.address,
      rest: chain.endpoints?.rest?.at(0)?.address,
      bip44: {
        coinType: Number(chain.coinType),
      },
      coinType: Number(chain.coinType),
      bech32Config: {
        bech32PrefixAccAddr: chain.bech32Prefix,
        bech32PrefixAccPub: `${chain.bech32Prefix}pub`,
        bech32PrefixValAddr: `${chain.bech32Prefix}valoper`,
        bech32PrefixValPub: `${chain.bech32Prefix}valoperpub`,
        bech32PrefixConsAddr: `${chain.bech32Prefix}valcons`,
        bech32PrefixConsPub: `${chain.bech32Prefix}valconspub`,
      },
      currencies: [
        {
          coinDenom: chain.assets[0].symbol,
          coinMinimalDenom: chain.assets[0].base,
          coinDecimals,
          coinGeckoId: chain.assets[0].coingecko_id || 'unknown',
        },
      ],
      feeCurrencies: [
        {
          coinDenom: chain.assets[0].symbol,
          coinMinimalDenom: chain.assets[0].base,
          coinDecimals,
          coinGeckoId: chain.assets[0].coingecko_id || 'unknown',
          gasPriceStep,
        },
      ],
      gasPriceStep,
      stakeCurrency: {
        coinDenom: chain.assets[0].symbol,
        coinMinimalDenom: chain.assets[0].base,
        coinDecimals,
        coinGeckoId: chain.assets[0].coingecko_id || 'unknown',
      },
      features: chain.keplrFeatures || [],
    },
    null,
    '\t'
  );
}

async function initParamsForLeap() {
  const chain = selected.value;

  if (!chain.endpoints?.rest?.at(0))
    throw new Error(ERROR_MESSAGE.ENDPOINT_NOT_SET);
  const client = CosmosRestClient.newDefault(
    chain.endpoints.rest?.at(0)?.address || ''
  );
  const b = await client.getBaseBlockLatest();

  const chainId = b.block.header.chain_id;

  const gasPriceStep = chain.keplrPriceStep || {
    low: 0.01,
    average: 0.025,
    high: 0.03,
  };
  const coinDecimals =
    chain.assets[0].denom_units.find(
      (x) => x.denom === chain.assets[0].symbol.toLowerCase()
    )?.exponent || 6;
  conf.value = JSON.stringify(
    {
      chainId,
      chainName: chain.chainName,
      rpc: chain.endpoints?.rpc?.at(0)?.address,
      rest: chain.endpoints?.rest?.at(0)?.address,
      bip44: {
        coinType: Number(chain.coinType),
      },
      coinType: Number(chain.coinType),
      bech32Config: {
        bech32PrefixAccAddr: chain.bech32Prefix,
        bech32PrefixAccPub: `${chain.bech32Prefix}pub`,
        bech32PrefixValAddr: `${chain.bech32Prefix}valoper`,
        bech32PrefixValPub: `${chain.bech32Prefix}valoperpub`,
        bech32PrefixConsAddr: `${chain.bech32Prefix}valcons`,
        bech32PrefixConsPub: `${chain.bech32Prefix}valconspub`,
      },
      currencies: [
        {
          coinDenom: chain.assets[0].symbol,
          coinMinimalDenom: chain.assets[0].base,
          coinDecimals,
          coinGeckoId: chain.assets[0].coingecko_id || 'unknown',
        },
      ],
      feeCurrencies: [
        {
          coinDenom: chain.assets[0].symbol,
          coinMinimalDenom: chain.assets[0].base,
          coinDecimals,
          coinGeckoId: chain.assets[0].coingecko_id || 'unknown',
          gasPriceStep,
        },
      ],
      gasPriceStep,
      stakeCurrency: {
        coinDenom: chain.assets[0].symbol,
        coinMinimalDenom: chain.assets[0].base,
        coinDecimals,
        coinGeckoId: chain.assets[0].coingecko_id || 'unknown',
      },
      features: chain.keplrFeatures || [],
      theme: {
        primaryColor: chain.themeColor,
      },
      image: chain.logo,
    },
    null,
    '\t'
  );
}

async function initForMetamask() {
  const chain = selected.value;

  if (!chain.endpoints?.rest?.at(0))
    throw new Error(ERROR_MESSAGE.ENDPOINT_NOT_SET);
  const client = CosmosRestClient.newDefault(
    chain.endpoints.rest?.at(0)?.address || ''
  );
  const b = await client.getBaseBlockLatest();

  const chainId = b.block.header.chain_id;

  const chainIdHex = `0x${extractChainId(chainId).toString(16)}`;

  const coinDecimals =
    chain.assets[0].denom_units.find(
      (x) => x.denom === chain.assets[0].symbol.toLowerCase()
    )?.exponent || 6;

  conf.value = JSON.stringify(
    {
      chainId: chainIdHex,
      chainName:
        chain.chainName === 'Titan Testnet'
          ? 'Titan (TKX) Testnet'
          : chain.chainName,
      rpcUrls: chain.jsonRpc,
      iconUrls: [chain.logo],
      nativeCurrency: {
        name: chain.assets[0].name,
        symbol: chain.assets[0].symbol,
        decimals: coinDecimals,
      },
      blockExplorerUrls: [
        'https://titan-testnet-explorer-light.titanlab.io',
      ],
    },
    null,
    '\t'
  );
}

async function connect() {
  sending.value = true;
  error.value = '';
  let accounts = [] as Account[];

  await checkWalletBeforeConnect();

  try {
    const wa = createWallet(name.value, {
      chainId: baseStore?.currentChainId,
      hdPath: chainStore?.defaultHDPath,
      prefix: chainStore.current?.bech32Prefix || 'cosmos',
    });
    await wa
      .getAccounts()
      .then((x) => {
        accounts = x;
        if (accounts.length > 0) {
          const [first] = accounts;
          connected.value = {
            wallet: name.value,
            cosmosAddress: first.address,
            hdPath: chainStore?.defaultHDPath,
          };
          writeWallet(connected.value, chainStore?.defaultHDPath);
          walletStateChange({
            value: connected.value,
          });
        }
        open.value = false;
      })
      .catch((e) => {
        if (e.message === ERROR_MESSAGE.INVALID_CHAIN) {
          if (name.value === WalletName.Leap) {
            (window as any).leap
              .experimentalSuggestChain(JSON.parse(conf.value))
              .catch((e: any) => {
                error.value = e;
              });
            return;
          }

          if (name.value === WalletName.Keplr) {
            (window as any).leap
              .experimentalSuggestChain(JSON.parse(conf.value))
              .catch((e: any) => {
                error.value = e;
              });
            return;
          }
        }
        error.value = e;
      });
  } catch (e: any) {
    error.value = e.message;
  }
  sending.value = false;
}

async function copyAddress(address: string) {
  try {
    await navigator.clipboard.writeText(address);
    showCopyToast.value = 1;
    setTimeout(() => {
      showCopyToast.value = 0;
    }, 1000);
  } catch (err) {
    showCopyToast.value = 2;
    setTimeout(() => {
      showCopyToast.value = 0;
    }, 1000);
  }
}

const tipMsg = computed(() => {
  return showCopyToast.value === 2
    ? { class: 'error', msg: 'Copy Error!' }
    : { class: 'success', msg: 'Copy Success!' };
});

const walletList = computed(() => {
  return initListWallet;
});
</script>

<template>
  <div class="dropdown dropdown-hover dropdown-end">
    <label
      tabindex="0"
      class="btn btn-sm btn-primary m-1 lowercase truncate !inline-flex text-xs md:!text-sm"
    >
      <Icon icon="mdi:wallet" />
      <span class="ml-1 hidden md:block">
        {{ walletStore.shortAddress || 'Wallet' }}</span
      >
    </label>
    <div
      tabindex="0"
      class="dropdown-content menu shadow p-2 bg-base-100 rounded w-52 md:!w-64 overflow-auto"
    >
      <label
        v-if="!walletStore?.currentAddress"
        for="PingConnectWallet"
        class="btn btn-sm btn-primary"
      >
        <Icon icon="mdi:wallet" /><span class="ml-1 block">Connect Wallet</span>
      </label>
      <div class="px-2 mb-1 text-gray-500 dark:text-gray-400 font-semibold">
        {{ walletStore.connectedWallet?.wallet }}
      </div>
      <div>
        <a
          v-if="walletStore.currentAddress"
          class="block py-2 px-2 hover:bg-gray-100 dark:hover:bg-[#353f5a] rounded cursor-pointer"
          style="overflow-wrap: anywhere"
          @click="copyAddress(walletStore.currentAddress)"
        >
          {{ walletStore.currentAddress }}
        </a>
        <div class="divider mt-1 mb-1"></div>
        <RouterLink to="/wallet/accounts">
          <div
            class="block py-2 px-2 hover:!bg-gray-100 rounded cursor-pointer"
          >
            Accounts
          </div>
        </RouterLink>
        <RouterLink to="/wallet/portfolio">
          <div
            class="block py-2 px-2 hover:!bg-gray-100 rounded cursor-pointer"
          >
            Portfolio
          </div>
        </RouterLink>
        <div v-if="walletStore.currentAddress" class="divider mt-1 mb-1"></div>
        <a
          v-if="walletStore.currentAddress"
          class="block py-2 px-2 hover:bg-gray-100 dark:hover:bg-[#353f5a] rounded cursor-pointer"
          @click="walletStore.disconnect()"
          >Disconnect</a
        >
      </div>
    </div>
    <div class="toast" v-show="showCopyToast === 1">
      <div class="alert alert-success">
        <div class="text-xs md:!text-sm">
          <span>{{ tipMsg.msg }}</span>
        </div>
      </div>
    </div>
    <div class="toast" v-show="showCopyToast === 2">
      <div class="alert alert-error">
        <div class="text-xs md:!text-sm">
          <span>{{ tipMsg.msg }}</span>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <!-- <ping-connect-wallet
      :chain-id="baseStore.currentChainId"
      :hd-path="chainStore.defaultHDPath"
      :addr-prefix="chainStore.current?.bech32Prefix || 'cosmos'"
      @connect="walletStateChange"
      @keplr-config="walletStore.suggestChain()"
    /> -->
    <input
      v-model="open"
      type="checkbox"
      id="PingConnectWallet"
      class="modal-toggle"
      @change="initData()"
    />
    <label for="PingConnectWallet" class="modal cursor-pointer z-[999999]">
      <label class="modal-box rounded-lg" for="">
        <h3 class="text-xl font-semibold">Connect Wallet</h3>
        <ul
          role="list"
          class="bg-gray-100 dark:bg-gray-900 rounded-lg mt-4 px-3 py-3"
        >
          <li
            class="flex items-center px-2 py-3 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
            v-for="(i, k) of walletList"
            :key="k"
            @click="selectWallet(i.wallet)"
          >
            <img
              class="h-10 w-10 bg-gray-50 rounded-full mr-4"
              :src="i.logo"
              alt=""
            />
            <p class="text-base font-semibold flex-1 dark:text-gray-300">
              {{ i.wallet }}
            </p>
            <div>
              <div
                v-if="i.wallet === name"
                class="mr-4 rounded-full bg-green-200"
              >
                <Icon icon="mdi:check" class="font-bold text-green-600" />
              </div>
            </div>
          </li>
        </ul>
        <div v-show="error" class="text-error mt-3">
          <span>{{ error }}.</span>
        </div>
        <div class="mt-8 text-right flex">
          <label
            class="btn btn-primary ping-connect-confirm grow"
            @click="connect()"
          >
            <span v-if="sending" class="loading loading-spinner"></span>
            Connect
          </label>
        </div>
      </label>
    </label>
  </Teleport>
</template>

<style>
.ping-connect-btn,
.ping-connect-dropdown {
  display: none !important;
}
</style>
