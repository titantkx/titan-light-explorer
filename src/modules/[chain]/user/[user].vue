<script lang="ts" setup>
import DonutChart from '@/components/charts/DonutChart.vue';
import Countdown from '@/components/Countdown.vue';
import DynamicComponent from '@/components/dynamic/DynamicComponent.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import {
  useBlockchain,
  useFormatter,
  useStakingStore,
  useTxDialog,
  useWalletStore,
} from '@/stores';
import {
  PageRequest,
  type AuthAccount,
  type Delegation,
  type DelegatorRewards,
  type PaginatedTxs,
  type UnbondingResponses,
} from '@/types';
import type { Coin } from '@cosmjs/amino';
import { Icon } from '@iconify/vue';
import { computed, ref } from '@vue/reactivity';
import { bech32 } from 'bech32';
import { Buffer } from 'buffer';
import { onMounted, watch, watchEffect } from 'vue';
import 'vue-json-pretty/lib/styles.css';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const vueRouters = useRouter();
const props = defineProps(['user', 'chain']);
const ethAddr = /^0x[a-fA-F0-9]{40}$/;

const walletStore = useWalletStore();

function toTitanAddr(ethAddr: string) {
  const words = bech32.toWords(Buffer.from(ethAddr.substring(2), 'hex'));
  return bech32.encode('titan', words);
}

function toEthAddr(titanAddr: string) {
  const { words } = bech32.decode(titanAddr);
  return '0x' + Buffer.from(bech32.fromWords(words)).toString('hex');
}

const blockchain = useBlockchain();
const stakingStore = useStakingStore();
const dialog = useTxDialog();
const format = useFormatter();
const account = ref({} as AuthAccount);
const txs = ref<PaginatedTxs>({
  txs: [],
  tx_responses: [],
  total: '',
  pagination: {
    next_key: '',
    total: '',
  },
});
const delegations = ref([] as Delegation[]);
const rewards = ref({} as DelegatorRewards);
const balances = ref([] as Coin[]);
const unbonding = ref([] as UnbondingResponses[]);
const unbondingTotal = ref(0);
const showCopyToast = ref(0);
const loadingTxs = ref(false);
const page = ref(new PageRequest());
page.value.limit = 10;

const totalAmountByCategory = computed(() => {
  let sumDel = 0;
  delegations.value?.forEach((x) => {
    sumDel += Number(x.balance.amount);
  });
  let sumRew = 0;
  rewards.value?.total?.forEach((x) => {
    sumRew += Number(x.amount);
  });
  let sumBal = 0;
  balances.value?.forEach((x) => {
    sumBal += Number(x.amount);
  });
  let sumUn = 0;
  unbonding.value?.forEach((x) => {
    x.entries?.forEach((y) => {
      sumUn += Number(y.balance);
    });
  });
  return [sumBal, sumDel, sumRew, sumUn];
});

const labels = ['Balance', 'Delegation', 'Reward', 'Unbonding'];

const totalAmount = computed(() => {
  return totalAmountByCategory.value.reduce((p, c) => c + p, 0);
});

const totalValue = computed(() => {
  let value = 0;
  delegations.value?.forEach((x) => {
    value += format.tokenValueNumber(x.balance);
  });
  rewards.value?.total?.forEach((x) => {
    value += format.tokenValueNumber(x);
  });
  balances.value?.forEach((x) => {
    value += format.tokenValueNumber(x);
  });
  unbonding.value?.forEach((x) => {
    x.entries?.forEach((y) => {
      value += format.tokenValueNumber({
        amount: y.balance,
        denom: stakingStore.params.bond_denom,
      });
    });
  });
  return format.formatNumber(value, '0,0.00');
});

onMounted(() => {
  loadAccount(props.user);
  loadTxs(1);
});

watch(route, () => {
  if (route.path.startsWith(`/${props.chain}/user/`))
    loadAccount(route.params.user as string);
});

watchEffect(() => {
  loadAccount(props.user);
});

async function loadTxs(pageNum: number) {
  try {
    loadingTxs.value = true;
    page.value.setPage(pageNum);
    const res = await blockchain.rpc.getTxsBySender(
      props.user ?? route.params.user,
      page.value
    );
    txs.value = res;
  } catch (error) {
    console.error(error);
  } finally {
    loadingTxs.value = false;
  }
}

function loadAccount(address: string) {
  if (!walletStore?.currentAddress) {
    vueRouters.replace({ path: `/${props.chain}/user` });
    return;
  }

  if (ethAddr.test(address)) {
    const titanAddr = toTitanAddr(address);
    vueRouters.replace({ path: `/${props.chain}/user/${titanAddr}` });
    return;
  }
  blockchain.rpc.getAuthAccount(address).then((x) => {
    account.value = x.account;
  });
  blockchain.rpc.getDistributionDelegatorRewards(address).then((x) => {
    rewards.value = x;
  });
  blockchain.rpc.getStakingDelegations(address).then((x) => {
    delegations.value = x.delegation_responses;
  });
  blockchain.rpc.getBankBalances(address).then((x) => {
    balances.value = x.balances;
  });
  blockchain.rpc.getStakingDelegatorUnbonding(address).then((x) => {
    unbonding.value = x.unbonding_responses;
    x.unbonding_responses?.forEach((y) => {
      y.entries.forEach((z) => {
        unbondingTotal.value += Number(z.balance);
      });
    });
  });
}

function updateEvent() {
  loadAccount(
    route.params['user'] ? (route.params['user'] as string) : props.user
  );
}

function findField(v: any, field: string) {
  if (!v || Array.isArray(v) || typeof v === 'string') return null;
  const fields = Object.keys(v);
  if (fields.includes(field)) {
    return v[field];
  }
  for (let i = 0; i < fields.length; i++) {
    const re: any = findField(v[fields[i]], field);
    if (re) return re;
  }
}

function showAddress(v: any) {
  return findField(v, 'address');
}

const copyWebsite = async (url: string) => {
  if (!url) {
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
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
};
const tipMsg = computed(() => {
  return showCopyToast.value === 2
    ? { class: 'error', msg: 'Copy Error!' }
    : { class: 'success', msg: 'Copy Success!' };
});
</script>
<template>
  <div v-if="account">
    <!-- address -->
    <div class="bg-base-100 px-4 pt-3 pb-4 rounded mb-4 shadow">
      <div class="flex items-center">
        <!-- img -->
        <div class="inline-flex relative w-11 h-11 rounded-md">
          <div
            class="w-11 h-11 absolute rounded-md opacity-10 bg-primary"
          ></div>
          <div
            class="w-full inline-flex items-center align-middle flex-none justify-center"
          >
            <Icon
              icon="mdi-qrcode"
              class="text-primary"
              style="width: 27px; height: 27px"
            />
          </div>
        </div>
        <!-- content -->
        <div class="flex flex-1 truncate pl-4">
          <h2 class="text-sm card-title">{{ $t('account.address') }}:</h2>
          <div class="flex flex-1 flex-col pl-4 gap-y-1">
            <div class="flex gap-x-1">
              <span class="text-xs truncate"> {{ showAddress(account) }}</span>
              <Icon
                icon="mdi:content-copy"
                class="ml-2 cursor-pointer"
                v-show="showAddress(account)"
                @click="copyWebsite(showAddress(account) || '')"
              />
            </div>

            <!-- <div class="flex gap-x-1">
              <span v-if="showAddress(account)" class="text-xs truncate">
                {{ toEthAddr(showAddress(account)) }}</span
              >
              <Icon
                icon="mdi:content-copy"
                class="ml-2 cursor-pointer"
                v-show="showAddress(account)"
                @click="copyWebsite(toEthAddr(showAddress(account)) || '')"
              />
            </div> -->
          </div>
        </div>
      </div>
    </div>

    <!-- Assets -->
    <div class="bg-base-100 px-4 pt-3 pb-4 rounded mb-4 shadow">
      <div class="flex justify-between">
        <h2 class="card-title mb-4">{{ $t('account.assets') }}</h2>
        <!-- button -->
        <div class="flex justify-end mb-4 pr-5">
          <label
            for="send"
            class="btn btn-primary btn-sm mr-2"
            @click="dialog.open('send', {}, updateEvent)"
            >{{ $t('account.btn_send') }}</label
          >
          <!--<label
            for="transfer"
            class="btn btn-primary btn-sm"
            @click="
              dialog.open(
                'transfer',
                {
                  chain_name: blockchain.current?.prettyName,
                },
                updateEvent
              )
            "
          >
            {{ $t('account.btn_transfer') }}
          </label>-->
        </div>
      </div>
      <div class="grid md:!grid-cols-3">
        <div class="md:!col-span-1">
          <DonutChart :series="totalAmountByCategory" :labels="labels" />
        </div>
        <div class="mt-4 md:!col-span-2 md:!mt-0 md:!ml-4">
          <!-- list-->
          <div class="">
            <!--balances  -->
            <div
              class="flex items-center px-4 mb-2"
              v-for="(balanceItem, index) in balances"
              :key="index"
            >
              <div
                class="w-9 h-9 rounded overflow-hidden flex items-center justify-center relative mr-4"
              >
                <Icon icon="mdi-account-cash" class="text-info" size="20" />
                <div
                  class="absolute top-0 bottom-0 left-0 right-0 bg-info opacity-20"
                ></div>
              </div>
              <div class="flex-1">
                <div class="text-sm font-semibold">
                  {{ format.formatToken(balanceItem) }}
                </div>
                <div class="text-xs">
                  {{ format.calculatePercent(balanceItem.amount, totalAmount) }}
                </div>
              </div>
              <div
                class="text-xs truncate relative py-1 px-3 rounded-full w-fit text-primary dark:invert mr-2"
              >
                <span
                  class="inset-x-0 inset-y-0 opacity-10 absolute bg-primary dark:invert text-sm"
                ></span>
                ${{ format.tokenValue(balanceItem) }}
              </div>
            </div>
            <!--delegations  -->
            <div
              class="flex items-center px-4 mb-2"
              v-for="(delegationItem, index) in delegations"
              :key="index"
            >
              <div
                class="w-9 h-9 rounded overflow-hidden flex items-center justify-center relative mr-4"
              >
                <Icon icon="mdi-user-clock" class="text-warning" size="20" />
                <div
                  class="absolute top-0 bottom-0 left-0 right-0 bg-warning opacity-20"
                ></div>
              </div>
              <div class="flex-1">
                <div class="text-sm font-semibold">
                  {{ format.formatToken(delegationItem?.balance) }}
                </div>
                <div class="text-xs">
                  {{
                    format.calculatePercent(
                      delegationItem?.balance?.amount,
                      totalAmount
                    )
                  }}
                </div>
              </div>
              <div
                class="text-xs truncate relative py-1 px-3 rounded-full w-fit text-primary dark:invert mr-2"
              >
                <span
                  class="inset-x-0 inset-y-0 opacity-10 absolute bg-primary dark:invert text-sm"
                ></span>
                ${{ format.tokenValue(delegationItem?.balance) }}
              </div>
            </div>
            <!-- rewards.total -->
            <div
              class="flex items-center px-4 mb-2"
              v-for="(rewardItem, index) in rewards.total"
              :key="index"
            >
              <div
                class="w-9 h-9 rounded overflow-hidden flex items-center justify-center relative mr-4"
              >
                <Icon
                  icon="mdi-account-arrow-up"
                  class="text-success"
                  size="20"
                />
                <div
                  class="absolute top-0 bottom-0 left-0 right-0 bg-success opacity-20"
                ></div>
              </div>
              <div class="flex-1">
                <div class="text-sm font-semibold">
                  {{ format.formatToken(rewardItem) }}
                </div>
                <div class="text-xs">
                  {{ format.calculatePercent(rewardItem.amount, totalAmount) }}
                </div>
              </div>
              <div
                class="text-xs truncate relative py-1 px-3 rounded-full w-fit text-primary dark:invert mr-2"
              >
                <span
                  class="inset-x-0 inset-y-0 opacity-10 absolute bg-primary dark:invert text-sm"
                ></span
                >${{ format.tokenValue(rewardItem) }}
              </div>
            </div>
            <!-- mdi-account-arrow-right -->
            <div class="flex items-center px-4">
              <div
                class="w-9 h-9 rounded overflow-hidden flex items-center justify-center relative mr-4"
              >
                <Icon
                  icon="mdi-account-arrow-right"
                  class="text-error"
                  size="20"
                />
                <div
                  class="absolute top-0 bottom-0 left-0 right-0 bg-error opacity-20"
                ></div>
              </div>
              <div class="flex-1">
                <div class="text-sm font-semibold">
                  {{
                    format.formatToken({
                      amount: String(unbondingTotal),
                      denom: stakingStore.params.bond_denom,
                    })
                  }}
                </div>
                <div class="text-xs">
                  {{ format.calculatePercent(unbondingTotal, totalAmount) }}
                </div>
              </div>
              <div
                class="text-xs truncate relative py-1 px-3 rounded-full w-fit text-primary dark:invert mr-2"
              >
                <span
                  class="inset-x-0 inset-y-0 opacity-10 absolute bg-primary dark:invert"
                ></span>
                ${{
                  format.tokenValue({
                    amount: String(unbondingTotal),
                    denom: stakingStore.params.bond_denom,
                  })
                }}
              </div>
            </div>
          </div>
          <div
            class="mt-4 text-lg font-semibold mr-5 pl-5 border-t pt-4 text-right"
          >
            {{ $t('account.total_value') }}: ${{ totalValue }}
          </div>
        </div>
      </div>
    </div>

    <!-- Delegations -->
    <div class="bg-base-100 px-4 pt-3 pb-4 rounded mb-4 shadow">
      <div class="flex justify-between">
        <h2 class="card-title mb-4">{{ $t('account.delegations') }}</h2>
        <div class="flex justify-end mb-4">
          <label
            for="delegate"
            class="btn btn-primary btn-sm mr-2"
            @click="dialog.open('delegate', {}, updateEvent)"
            >{{ $t('account.btn_delegate') }}</label
          >
          <label
            for="withdraw_all"
            class="btn btn-primary btn-sm"
            @click="dialog.open('withdraw_all', {}, updateEvent)"
            >{{ $t('account.btn_withdraw_all') }}</label
          >
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="table w-full text-sm table-zebra">
          <thead>
            <tr>
              <th class="py-3">{{ $t('account.validator') }}</th>
              <th class="py-3">{{ $t('account.delegation') }}</th>
              <th class="py-3">{{ $t('account.rewards') }}</th>
              <th class="py-3">{{ $t('account.action') }}</th>
            </tr>
          </thead>
          <tbody class="text-sm">
            <tr v-if="delegations.length === 0">
              <td colspan="10">
                <div class="text-center">
                  {{ $t('account.no_delegations') }}
                </div>
              </td>
            </tr>
            <tr v-for="(v, index) in delegations" :key="index">
              <td class="text-caption text-primary py-3">
                <RouterLink
                  :to="`/${chain}/staking/${v.delegation.validator_address}`"
                  >{{
                    format.validatorFromBech32(
                      v.delegation.validator_address
                    ) || v.delegation.validator_address
                  }}</RouterLink
                >
              </td>
              <td class="py-3">
                {{ format.formatToken(v.balance, true, '0,0.[000000]') }}
              </td>
              <td class="py-3">
                {{
                  format.formatTokens(
                    rewards?.rewards?.find(
                      (x) =>
                        x.validator_address === v.delegation.validator_address
                    )?.reward
                  )
                }}
              </td>
              <td class="py-3">
                <div v-if="v.balance" class="flex justify-end">
                  <label
                    for="delegate"
                    class="btn btn-primary btn-xs mr-2"
                    @click="
                      dialog.open(
                        'delegate',
                        {
                          validator_address: v.delegation.validator_address,
                        },
                        updateEvent
                      )
                    "
                    >{{ $t('account.btn_delegate') }}</label
                  >
                  <label
                    for="redelegate"
                    class="btn btn-primary btn-xs mr-2"
                    @click="
                      dialog.open(
                        'redelegate',
                        {
                          validator_address: v.delegation.validator_address,
                        },
                        updateEvent
                      )
                    "
                    >{{ $t('account.btn_redelegate') }}</label
                  >
                  <label
                    for="unbond"
                    class="btn btn-primary btn-xs"
                    @click="
                      dialog.open(
                        'unbond',
                        {
                          validator_address: v.delegation.validator_address,
                        },
                        updateEvent
                      )
                    "
                    >{{ $t('account.btn_unbond') }}</label
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Unbonding Delegations -->
    <div
      class="bg-base-100 px-4 pt-3 pb-4 rounded mb-4 shadow"
      v-if="unbonding && unbonding.length > 0"
    >
      <h2 class="card-title mb-4">{{ $t('account.unbonding_delegations') }}</h2>
      <div class="overflow-x-auto">
        <table class="table text-sm w-full">
          <thead>
            <tr>
              <th class="py-3">{{ $t('account.creation_height') }}</th>
              <th class="py-3">{{ $t('account.initial_balance') }}</th>
              <th class="py-3">{{ $t('account.balance') }}</th>
              <th class="py-3">{{ $t('account.completion_time') }}</th>
            </tr>
          </thead>
          <tbody class="text-sm" v-for="(v, index) in unbonding" :key="index">
            <tr>
              <td
                class="text-caption text-primary py-3 bg-slate-200"
                colspan="10"
              >
                <RouterLink :to="`/${chain}/staking/${v.validator_address}`">{{
                  format.validatorFromBech32(v.validator_address) ||
                  v.validator_address
                }}</RouterLink>
              </td>
            </tr>
            <tr
              v-for="(entry, index) in v.entries"
              :key="`entry-table-row-${index}`"
            >
              <td class="py-3">{{ entry.creation_height }}</td>
              <td class="py-3">
                {{
                  format.formatToken(
                    {
                      amount: entry.initial_balance,
                      denom: stakingStore.params.bond_denom,
                    },
                    true,
                    '0,0.[00]'
                  )
                }}
              </td>
              <td class="py-3">
                {{
                  format.formatToken(
                    {
                      amount: entry.balance,
                      denom: stakingStore.params.bond_denom,
                    },
                    true,
                    '0,0.[00]'
                  )
                }}
              </td>
              <td class="py-3">
                <Countdown
                  :time="
                    new Date(entry.completion_time).getTime() -
                    new Date().getTime()
                  "
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Transactions -->
    <div class="bg-base-100 px-4 pt-3 pb-4 rounded mb-4 shadow">
      <h2 class="card-title mb-4">{{ $t('account.transactions') }}</h2>
      <div class="overflow-x-auto">
        <table class="table w-full text-sm">
          <thead>
            <tr>
              <th class="py-3">{{ $t('account.height') }}</th>
              <th class="py-3">{{ $t('account.hash') }}</th>
              <th class="py-3">{{ $t('account.messages') }}</th>
              <th class="py-3">{{ $t('account.time') }}</th>
            </tr>
          </thead>
          <tbody class="text-sm">
            <template v-if="loadingTxs">
              <tr v-for="i in 5" :key="i" class="animate-pulse">
                <td class="py-3">
                  <div
                    class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[480px] mb-2.5"
                  ></div>
                </td>
                <td class="py-3">
                  <div
                    class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[480px] mb-2.5"
                  ></div>
                </td>
                <td class="py-3">
                  <div
                    class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[480px] mb-2.5"
                  ></div>
                </td>
                <td class="py-3">
                  <div
                    class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[480px] mb-2.5"
                  ></div>
                </td>
              </tr>
            </template>
            <tr v-else-if="txs.tx_responses.length === 0">
              <td colspan="4">
                <div class="text-center">
                  {{ $t('account.no_transactions') }}
                </div>
              </td>
            </tr>
            <tr v-for="(v, index) in txs.tx_responses" :key="index" v-else>
              <td class="text-sm py-3">
                <RouterLink
                  :to="`/${chain}/block/${v.height}`"
                  class="text-primary dark:invert"
                  >{{ v.height }}</RouterLink
                >
              </td>
              <td class="truncate py-3" style="max-width: 200px">
                <RouterLink
                  :to="`/${chain}/tx/${v.txhash}`"
                  class="text-primary dark:invert"
                >
                  {{ v.txhash }}
                </RouterLink>
              </td>
              <td class="flex items-center py-3">
                <div class="mr-2">
                  {{ format.messages(v.tx.body.messages) }}
                </div>
                <Icon
                  v-if="v.code === 0"
                  icon="mdi-check"
                  class="text-success text-lg"
                />
                <Icon v-else icon="mdi-multiply" class="text-error text-lg" />
              </td>
              <td class="py-3">
                {{ format.toLocaleDate(v.timestamp) }}
                <span class="text-xs"
                  >({{ format.toDay(v.timestamp, 'from') }})</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationBar
        :limit="page.limit"
        :total="txs?.total"
        :callback="loadTxs"
      />
    </div>

    <!-- Account -->
    <div class="bg-base-100 px-4 pt-3 pb-4 rounded mb-4 shadow">
      <h2 class="card-title mb-4">{{ $t('account.acc') }}</h2>
      <DynamicComponent :value="account" />
    </div>

    <!-- toast message -->
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
  <div v-else class="text-no text-sm">{{ $t('account.error') }}</div>
</template>
