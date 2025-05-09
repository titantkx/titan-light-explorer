<script lang="ts" setup>
import PriceMarketChart from '@/components/charts/PriceMarketChart.vue';
import {
  useBlockchain,
  useFormatter,
  useParamStore,
  useStakingStore,
  useTxDialog,
  useWalletStore,
} from '@/stores';
import { Icon } from '@iconify/vue';
import { computed } from '@vue/reactivity';
import MdEditor from 'md-editor-v3';
import { onMounted, ref } from 'vue';
import { colorMap, useIndexModule } from './indexStore';

import CardStatisticsVertical from '@/components/CardStatisticsVertical.vue';
import ArrayObjectElement from '@/components/dynamic/ArrayObjectElement.vue';
import ProposalListItem from '@/components/ProposalListItem.vue';

const props = defineProps(['chain']);

const blockchain = useBlockchain();
const store = useIndexModule();
const walletStore = useWalletStore();
const format = useFormatter();
const dialog = useTxDialog();
const stakingStore = useStakingStore();
const paramStore = useParamStore();
const coinInfo = computed(() => {
  return store.coinInfo;
});

onMounted(() => {
  store.loadDashboard();
  walletStore.loadMyAsset();
  paramStore.initial();
  paramStore.handleAbciInfo();
  // if(!(coinInfo.value && coinInfo.value.name)) {
  // }
});
const ticker = computed(() => store.coinInfo.tickers[store.tickerIndex]);

const currName = ref('');
blockchain.$subscribe((m, s) => {
  if (s.chainName !== currName.value) {
    currName.value = s.chainName;
    // because duplicate call
    // store.loadDashboard();
    walletStore.loadMyAsset();
    paramStore.handleAbciInfo();
  }
});
function shortName(name: string, id: string) {
  return name.toLowerCase().startsWith('ibc/') ||
    name.toLowerCase().startsWith('0x')
    ? id
    : name;
}

const comLinks = computed(() => {
  let links: Array<{
    name: string;
    icon: string;
    href: string;
  }> = [];

  if (!!store.homepage) {
    links = [
      ...links,
      {
        name: 'Website',
        icon: 'mdi-web',
        href: store.homepage,
      },
    ];
  }

  if (!!store.twitter) {
    links = [
      ...links,
      {
        name: 'Twitter',
        icon: 'mdi-twitter',
        href: store.twitter,
      },
    ];
  }

  if (!!store.telegram) {
    links = [
      ...links,
      {
        name: 'Telegram',
        icon: 'mdi-telegram',
        href: store.telegram,
      },
    ];
  }

  if (!!store.github) {
    links = [
      ...links,
      {
        name: 'Github',
        icon: 'mdi-github',
        href: store.github,
      },
    ];
  }

  return links;
});

// wallet box
const change = computed(() => {
  const token = walletStore.balanceOfStakingToken;
  return token ? format.priceChanges(token.denom) : 0;
});
const color = computed(() => {
  switch (true) {
    case change.value > 0:
      return 'text-green-600';
    case change.value === 0:
      return 'text-grey-500';
    case change.value < 0:
      return 'text-red-600';
  }
});

function updateState() {
  walletStore.loadMyAsset();
}

function trustColor(v: string) {
  return `text-${colorMap(v)}`;
}

const quantity = ref(100);
const qty = computed({
  get: () => {
    return parseFloat(quantity.value.toFixed(6));
  },
  set: (val) => {
    quantity.value = val;
  },
});
const amount = computed({
  get: () => {
    return quantity.value * ticker.value.converted_last.usd || 0;
  },
  set: (val) => {
    quantity.value = val / ticker.value.converted_last.usd || 0;
  },
});
</script>

<template>
  <div>
    <div class="grid grid-cols-1 gap-4 md:!grid-cols-3 lg:!grid-cols-6">
      <div v-for="(item, key) in store.stats" :key="key">
        <CardStatisticsVertical v-bind="item" />
      </div>
    </div>

    <div
      v-if="blockchain.supportModule('governance')"
      class="bg-base-100 rounded mt-4 shadow"
    >
      <div class="px-4 pt-4 pb-2 text-lg font-semibold text-main">
        {{ $t('index.active_proposals') }}
      </div>
      <div class="px-4 pb-4">
        <ProposalListItem :proposals="store?.proposals" />
      </div>
      <div
        class="pb-8 text-center"
        v-if="store.proposals?.proposals?.length === 0"
      >
        {{ $t('index.no_active_proposals') }}
      </div>
    </div>

    <div class="bg-base-100 rounded mt-4">
      <div class="px-4 pt-4 pb-2 text-lg font-semibold text-main">
        {{ $t('index.app_versions') }}
      </div>
      <!-- Application Version -->
      <ArrayObjectElement
        :value="paramStore.appVersion?.items"
        :thead="false"
      />
      <div class="h-4"></div>
    </div>

    <div
      v-if="coinInfo && coinInfo.name"
      class="bg-base-100 rounded shadow mt-4"
    >
      <div class="grid grid-cols-2 md:grid-cols-3 p-4">
        <div class="col-span-2 md:col-span-1">
          <div class="text-xl font-semibold text-main">
            {{ coinInfo.name }} (<span class="uppercase">{{
              coinInfo.symbol
            }}</span
            >)
          </div>
          <div class="text-xs mt-2">
            {{ $t('index.rank') }}:
            <div
              class="badge text-xs badge-error bg-[#fcebea] dark:bg-[#41384d] text-red-400"
            >
              #{{ coinInfo.market_cap_rank }}
            </div>
          </div>

          <div class="my-4 flex flex-wrap items-center">
            <a
              v-for="(item, index) of comLinks"
              :key="index"
              :href="item.href"
              class="link link-primary px-2 py-1 rounded-sm no-underline hover:text-primary hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center"
            >
              <Icon :icon="item?.icon" />
              <span class="ml-1 text-sm uppercase">{{ item?.name }}</span>
            </a>
          </div>

          <div>
            <div class="dropdown dropdown-hover w-full">
              <label>
                <div
                  class="bg-gray-100 dark:bg-[#384059] flex items-center justify-between px-4 py-2 cursor-pointer rounded"
                >
                  <div>
                    <div
                      class="font-semibold text-xl text-[#666] dark:text-white"
                    >
                      {{ ticker?.market?.name || '' }}
                    </div>
                    <div class="text-info text-sm">
                      {{ shortName(ticker?.base, ticker.coin_id) }}
                      <!-- /{{
                        shortName(ticker?.target, ticker.target_coin_id)
                      }} -->
                    </div>
                  </div>

                  <div class="text-right">
                    <div
                      class="text-xl font-semibold text-[#666] dark:text-white"
                    >
                      ${{ ticker.converted_last.usd }}
                    </div>
                    <div class="text-sm" :class="store.priceColor">
                      {{ store.priceChange }}%
                    </div>
                  </div>
                </div>
              </label>
              <!-- <div class="dropdown-content pt-1">
                <div class="h-64 overflow-auto w-full shadow rounded">
                  <ul class="menu w-full bg-gray-100 rounded dark:bg-[#384059]">
                    <li
                      v-for="(item, index) in store.coinInfo.tickers"
                      :key="index"
                      @click="store.selectTicker(index)"
                    >
                      <div
                        class="flex items-center justify-between hover:bg-base-100"
                      >
                        <div class="flex-1">
                          <div
                            class="text-main text-sm"
                            :class="trustColor(item.trust_score)"
                          >
                            {{ item?.market?.name }}
                          </div>
                          <div class="text-sm text-gray-500 dark:text-gray-400">
                            {{ shortName(item?.base, item.coin_id) }}/{{
                              shortName(item?.target, item.target_coin_id)
                            }}
                          </div>
                        </div>

                        <div class="text-base text-main">
                          ${{ item.converted_last.usd }}
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div> -->
            </div>

            <div class="flex">
              <label class="btn btn-primary !px-1 my-5 mr-2" for="calculator">
                <svg
                  class="w-8 h-8"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                    <line x1="8" x2="16" y1="6" y2="6"></line>
                    <line x1="16" x2="16" y1="14" y2="18"></line>
                    <path d="M16 10h.01"></path>
                    <path d="M12 10h.01"></path>
                    <path d="M8 10h.01"></path>
                    <path d="M12 14h.01"></path>
                    <path d="M8 14h.01"></path>
                    <path d="M12 18h.01"></path>
                    <path d="M8 18h.01"></path>
                  </g>
                </svg>
              </label>
              <!-- Put this part before </body> tag -->
              <input type="checkbox" id="calculator" class="modal-toggle" />
              <div class="modal">
                <div class="modal-box">
                  <h3 class="text-lg font-bold">
                    {{ $t('index.price_calculator') }}
                  </h3>
                  <div class="flex flex-col w-full mt-5">
                    <div
                      class="grid h-20 flex-grow card rounded-box place-items-center"
                    >
                      <div class="join w-full">
                        <label class="join-item btn">
                          <span class="uppercase">{{ coinInfo.symbol }}</span>
                        </label>
                        <input
                          type="number"
                          v-model="qty"
                          min="0"
                          placeholder="Input a number"
                          class="input grow input-bordered join-item"
                        />
                      </div>
                    </div>
                    <div class="divider">=</div>
                    <div
                      class="grid h-20 flex-grow card rounded-box place-items-center"
                    >
                      <div class="join w-full">
                        <label class="join-item btn">
                          <span>USD</span>
                        </label>
                        <input
                          type="number"
                          v-model="amount"
                          min="0"
                          placeholder="Input amount"
                          class="join-item grow input input-bordered"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <label class="modal-backdrop" for="calculator">{{
                  $t('index.close')
                }}</label>
              </div>
              <a
                class="my-5 !text-white btn grow"
                :class="{
                  '!btn-success': store.trustColor === 'green',
                  '!btn-warning': store.trustColor === 'yellow',
                }"
                :href="ticker.trade_url"
                target="_blank"
              >
                {{ $t('index.buy') }} {{ coinInfo.symbol || '' }}
              </a>
            </div>
          </div>
        </div>

        <div class="col-span-2">
          <PriceMarketChart />
        </div>
      </div>
      <div class="h-[1px] w-full bg-gray-100 dark:bg-[#384059]"></div>
      <div class="max-h-[250px] overflow-auto p-4 text-sm">
        <MdEditor
          :model-value="coinInfo.description?.en"
          previewOnly
        ></MdEditor>
      </div>
      <div class="mx-4 flex flex-wrap items-center">
        <div
          v-for="(tag, index) in coinInfo.categories"
          :key="`tag-row-${index}`"
          class="mr-2 mb-4 text-xs bg-gray-100 dark:bg-[#384059] px-3 rounded-full py-1"
        >
          {{ tag }}
        </div>
      </div>
    </div>

    <div v-if="!store.coingeckoId" class="bg-base-100 rounded mt-4">
      <div class="px-4 pt-4 pb-2 text-lg font-semibold text-main">
        {{ $t('index.node_info') }}
      </div>
      <ArrayObjectElement
        :value="paramStore.nodeVersion?.items"
        :thead="false"
      />
      <div class="h-4"></div>
    </div>
  </div>
</template>

<route>
  {
    meta: {
      i18n: 'dashboard',
      order: 1,
    }
  }
</route>
