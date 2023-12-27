<script lang="ts" setup>
import DynamicComponent from '@/components/dynamic/DynamicComponent.vue';
import { useBlockchain, useFormatter } from '@/stores';
import type { Tx, TxResponse } from '@/types';
import { computed, ref } from '@vue/reactivity';
import axios from 'axios';
import { watch } from 'vue';
import JsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { useRoute } from 'vue-router';

const route = useRoute();
const props = defineProps(['hash', 'chain']);
const blockchain = useBlockchain();
const format = useFormatter();

const tx = ref(
  {} as {
    tx: Tx;
    tx_response: TxResponse;
  }
);

const ethTx = ref(
  {} as {
    blockHash: string;
    blockNumber: string;
    from: string;
    gas: string;
    gasPrice: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    hash: string;
    input: string;
    nonce: string;
    to: string;
    transactionIndex: string;
    value: string;
    type: string;
    accessList: [];
    chainId: string;
    v: string;
    r: string;
    s: string;
  }
);

const isEth = ref(false);

const messages = computed(() => {
  return tx.value.tx?.body?.messages || [];
});

const txhash = /^[A-Z\d]{64}$/;
const ethTxHash = /^0x[a-fA-F0-9]{64}$/;

loadTx(props.hash);

watch(route, () => {
  if (route.path.startsWith(`/${props.chain}/tx/`))
    loadTx(route.params.hash as string);
});

function loadTx(hash: string) {
  if (txhash.test(hash)) {
    blockchain.rpc
      .getTx(hash)
      .then((resp) => (tx.value = resp))
      .catch((e) => window.alert(e));
  } else if (ethTxHash.test(hash)) {
    isEth.value = true;
    if (blockchain.current?.jsonRpc) {
      axios
        .post(blockchain.current.jsonRpc[0], {
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [hash],
          id: 1,
        })
        .then((resp) => (ethTx.value = resp.data.result))
        .catch((e) => window.alert(e));
    } else {
      window.alert(`JSON RPC URL must be set!!!`);
    }
  } else {
    window.alert(`Invalid tx hash!!!`);
  }
}
</script>
<template>
  <div v-if="isEth">
    <div
      v-if="ethTx.hash"
      class="bg-base-100 px-4 pt-3 pb-4 rounded shadow mb-4"
    >
      <h2 class="card-title truncate mb-2">{{ $t('tx.title') }}</h2>
      <div class="overflow-auto-x">
        <table class="table text-sm">
          <tbody>
            <tr>
              <td>{{ $t('tx.tx_hash') }}</td>
              <td>{{ ethTx.hash }}</td>
            </tr>
            <tr>
              <td>{{ $t('account.height') }}</td>
              <td>
                <RouterLink
                  :to="`/${props.chain}/block/${Number(ethTx.blockNumber)}`"
                  class="text-primary dark:invert"
                  >{{ Number(ethTx.blockNumber) }}
                </RouterLink>
              </td>
            </tr>
            <tr>
              <td>{{ $t('tx.gas') }}</td>
              <td>
                {{ Number(ethTx.gas) }}
              </td>
            </tr>
            <tr>
              <td>{{ $t('tx.fee') }}</td>
              <td>
                {{
                  format.formatTokens(
                    [
                      {
                        denom: 'utkx',
                        amount: (
                          BigInt(ethTx.gas) * BigInt(ethTx.gasPrice)
                        ).toString(),
                      },
                    ],
                    true,
                    '0,0.[000000000000000000]'
                  )
                }}
              </td>
            </tr>
            <tr>
              <td>From Address</td>
              <td>
                <RouterLink
                  :to="`/${props.chain}/account/${ethTx.from}`"
                  class="text-primary dark:invert"
                  >{{ ethTx.from }}
                </RouterLink>
              </td>
            </tr>
            <tr v-if="ethTx.to">
              <td>To Address</td>
              <td>
                <RouterLink
                  :to="`/${props.chain}/account/${ethTx.to}`"
                  class="text-primary dark:invert"
                  >{{ ethTx.to }}
                </RouterLink>
              </td>
            </tr>
            <tr>
              <td>Amount</td>
              <td>
                {{
                  format.formatTokens(
                    [
                      {
                        denom: 'utkx',
                        amount: BigInt(ethTx.value).toString(),
                      },
                    ],
                    true,
                    '0,0.[000000000000000000]'
                  )
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-if="ethTx.hash" class="bg-base-100 px-4 pt-3 pb-4 rounded shadow">
      <h2 class="card-title truncate mb-2">JSON</h2>
      <JsonPretty :data="ethTx" :deep="3" />
    </div>
  </div>
  <div v-else>
    <div
      v-if="tx.tx_response"
      class="bg-base-100 px-4 pt-3 pb-4 rounded shadow mb-4"
    >
      <h2 class="card-title truncate mb-2">{{ $t('tx.title') }}</h2>
      <div class="overflow-auto-x">
        <table class="table text-sm">
          <tbody>
            <tr>
              <td>{{ $t('tx.tx_hash') }}</td>
              <td>{{ tx.tx_response.txhash }}</td>
            </tr>
            <tr>
              <td>{{ $t('account.height') }}</td>
              <td>
                <RouterLink
                  :to="`/${props.chain}/block/${tx.tx_response.height}`"
                  class="text-primary dark:invert"
                  >{{ tx.tx_response.height }}
                </RouterLink>
              </td>
            </tr>
            <tr>
              <td>{{ $t('staking.status') }}</td>
              <td>
                <div
                  class="text-xs truncate relative py-2 px-4 w-fit mr-2 rounded"
                  :class="`text-${
                    tx.tx_response.code === 0 ? 'success' : 'error'
                  }`"
                >
                  <span
                    class="inset-x-0 inset-y-0 opacity-10 absolute"
                    :class="`bg-${
                      tx.tx_response.code === 0 ? 'success' : 'error'
                    }`"
                  ></span>
                  {{ tx.tx_response.code === 0 ? 'Success' : 'Failed' }}
                </div>
              </td>
            </tr>
            <tr>
              <td>{{ $t('account.time') }}</td>
              <td>
                {{ format.toLocaleDate(tx.tx_response.timestamp) }} ({{
                  format.toDay(tx.tx_response.timestamp, 'from')
                }})
              </td>
            </tr>
            <tr>
              <td>{{ $t('tx.gas') }}</td>
              <td>
                {{ tx.tx_response.gas_used }} / {{ tx.tx_response.gas_wanted }}
              </td>
            </tr>
            <tr>
              <td>{{ $t('tx.fee') }}</td>
              <td>
                {{
                  format.formatTokens(
                    tx.tx?.auth_info?.fee?.amount,
                    true,
                    '0,0.[000000000000000000]'
                  )
                }}
              </td>
            </tr>
            <tr>
              <td>{{ $t('tx.memo') }}</td>
              <td>{{ tx.tx.body.memo }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="tx.tx_response"
      class="bg-base-100 px-4 pt-3 pb-4 rounded shadow mb-4"
    >
      <h2 class="card-title truncate mb-2">
        {{ $t('account.messages') }}: ({{ messages.length }})
      </h2>
      <div v-for="(msg, i) in messages">
        <div class="border border-slate-400 rounded-md mt-4">
          <DynamicComponent :value="msg" />
        </div>
      </div>
      <div v-if="messages.length === 0">{{ $t('tx.no_messages') }}</div>
    </div>

    <div
      v-if="tx.tx_response"
      class="bg-base-100 px-4 pt-3 pb-4 rounded shadow"
    >
      <h2 class="card-title truncate mb-2">JSON</h2>
      <JsonPretty :data="tx" :deep="3" />
    </div>
  </div>
</template>
