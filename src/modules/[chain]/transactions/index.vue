<script lang="ts" setup>
import PaginationBar from '@/components/PaginationBar.vue';
import { useBlockchain, useFormatter } from '@/stores';
import {
  PageRequest,
  type Attributes,
  type PaginatedTxs,
  type Tx,
} from '@/types';
import { onMounted, ref } from 'vue';

const props = defineProps(['chain']);

const chainStore = useBlockchain();
const format = useFormatter();

const tx = ref<PaginatedTxs>({
  txs: [],
  tx_responses: [],
  total: '',
  pagination: {
    next_key: '',
    total: '',
  },
});

const page = ref(new PageRequest());
page.value.limit = 10;

const loading = ref(true);

onMounted(() => {
  loadPage(1);
});

async function loadPage(pageNum: number) {
  try {
    loading.value = true;
    page.value.setPage(pageNum);

    const res = await chainStore.rpc.getTxs(
      '?events=tx.height>=1&order_by=2',
      {},
      page.value
    );
    tx.value = res;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

const getRefundAmount = (
  events: {
    type: string;
    attributes: Attributes[];
  }[]
): { denom: string; amount: string } => {
  if (!events) return format.parseToken('0');

  const refundEvent = events.find((event) => event.type === 'refund');
  if (!refundEvent) return format.parseToken('0');

  const amountAttribute = refundEvent.attributes.find(
    (attr) => attr.key === 'amount'
  );
  if (!amountAttribute) return format.parseToken('0');

  return format.parseToken(amountAttribute.value);
};

function getFee(
  tx: Tx,
  events: {
    type: string;
    attributes: Attributes[];
  }[]
): string {
  if (!tx?.auth_info?.fee?.amount || !events) return '';

  const refundAmount = getRefundAmount(events);

  const fee = tx.auth_info.fee.amount.map((fee) => {
    if (fee.denom === refundAmount.denom) {
      const adjustedAmount = BigInt(fee.amount) - BigInt(refundAmount.amount);
      return {
        denom: fee.denom,
        amount: adjustedAmount.toString(),
      };
    }
    return fee;
  });

  return format.formatTokens(fee);
}

const getAmount = (messages: any[]): string => {
  if (messages.length === 0) return '-';

  const messagesWithAmount = messages.filter((msg) => 'amount' in msg);
  if (messagesWithAmount.length === 0) return '-';

  const amounts = messagesWithAmount.map((msg) => msg.amount).flat();
  return format.formatTokens(amounts);
};
</script>

<template>
  <div class="bg-base-100 px-4 pt-3 pb-4 rounded mb-4 shadow">
    <h2 class="card-title mb-4">{{ $t('account.transactions') }}</h2>
    <div class="overflow-x-auto">
      <table class="table w-full text-sm">
        <thead>
          <tr>
            <th class="py-3">{{ $t('account.height') }}</th>
            <th class="py-3">{{ $t('account.hash') }}</th>
            <th class="py-3">{{ $t('account.messages') }}</th>
            <th class="py-3">{{ $t('tx.amount') }}</th>
            <th class="py-3">{{ $t('tx.fee') }}</th>
            <th class="py-3">{{ $t('account.time') }}</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <template v-if="loading">
            <tr v-for="i in page.limit" :key="i" class="animate-pulse">
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
          <tr v-else-if="tx.tx_responses.length === 0">
            <td colspan="4">
              <div class="text-center">
                {{ $t('account.no_transactions') }}
              </div>
            </td>
          </tr>
          <tr v-for="(v, index) in tx.tx_responses" :key="index" v-else>
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
              {{ getAmount(v.tx.body.messages) }}
            </td>
            <td class="py-3">
              {{ getFee(v.tx, v.events) }}
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
      :total="tx?.total"
      :callback="loadPage"
    />
  </div>
</template>

<route>
  {
    meta: {
      i18n: 'transactions',
      order: 13
    }
  }
</route>
