<script lang="ts" setup>
import PaginationBar from '@/components/PaginationBar.vue';
import { CosmosRestClient } from '@/libs/client';
import { getDynamicApiCosmosDirectory } from '@/libs/network';
import { formatSeconds } from '@/libs/utils';
import { useBaseStore, useBlockchain, useFormatter } from '@/stores';
import {
  PageRequest,
  type Channel,
  type ClientState,
  type Connection,
  type PaginatedTxs,
} from '@/types';
import { Icon } from '@iconify/vue';
import { computed, onMounted, ref, watchEffect } from 'vue';
import { useIBCModule } from '../connStore';

const props = defineProps(['chain', 'connection_id']);
const chainStore = useBlockchain();
const baseStore = useBaseStore();
const format = useFormatter();
const ibcStore = useIBCModule();
const conn = ref({} as Connection);
const connFrom = ref({} as Connection);
const clientState = ref({} as { client_id: string; client_state: ClientState });
const clientStatus = ref({} as { status: string });
const clientFromStatus = ref({} as { status: string });
const channels = ref([] as Channel[]);

const connId = computed(() => {
  return props.connection_id || 0;
});

const loading = ref(false);
const loadingStatusClientEffect = ref(true);
const loadingBlockHeightEffect = ref(true);
const loadingIbcConnection = ref(true);
const lastUpdatedTo = ref('');
const lastUpdatedFrom = ref('');
const txs = ref({} as PaginatedTxs);
const direction = ref('');
const channel_id = ref('');
const port_id = ref('');
const page = ref(new PageRequest());
page.value.limit = 5;

onMounted(async () => {
  if (connId.value) {
    try {
      const [clientStateResponse, channelsResponse, connectionResponse] =
        await Promise.all([
          chainStore.rpc.getIBCConnectionsClientState(connId.value),
          chainStore.rpc.getIBCConnectionsChannels(connId.value),
          chainStore.rpc.getIBCConnectionsById(connId.value),
        ]);

      clientState.value = clientStateResponse.identified_client_state;
      channels.value = channelsResponse.channels;
      conn.value = connectionResponse.connection;

      const clientStatusResponse =
        await chainStore.rpc.getIBCClientStatusByClientId(conn.value.client_id);
      clientStatus.value = clientStatusResponse;
    } catch (error) {
      console.error('Error fetching IBC connection data:', error);
      // Handle error appropriately (e.g., show error message to user)
    }
  }
});

function loadChannel(channel: string, port: string) {
  chainStore.rpc.getIBCChannelNextSequence(channel, port).then((x) => {
    console.log(x);
  });
}

function pageload(pageNum: number) {
  if (direction.value === 'In') {
    fetchSendingTxs(channel_id.value, port_id.value, pageNum - 1);
  } else {
    fetchSendingTxs(channel_id.value, port_id.value, pageNum - 1);
  }
}

function fetchSendingTxs(channel: string, port: string, pageNum = 0) {
  page.value.setPage(pageNum);
  loading.value = true;
  direction.value = 'Out';
  channel_id.value = channel;
  port_id.value = port;
  txs.value = {} as PaginatedTxs;
  chainStore.rpc
    .getTxs(
      "?order_by=2&events=send_packet.packet_src_channel='{channel}'&events=send_packet.packet_src_port='{port}'",
      { channel, port },
      page.value
    )
    .then((res) => {
      txs.value = res;
    })
    .finally(() => (loading.value = false));
}
function fetchRecevingTxs(channel: string, port: string, pageNum = 0) {
  page.value.setPage(pageNum);
  loading.value = true;
  direction.value = 'In';
  channel_id.value = channel;
  port_id.value = port;
  txs.value = {} as PaginatedTxs;
  chainStore.rpc
    .getTxs(
      "?order_by=2&events=recv_packet.packet_dst_channel='{channel}'&events=recv_packet.packet_dst_port='{port}'",
      { channel, port },
      page.value
    )
    .then((res) => {
      txs.value = res;
    })
    .finally(() => (loading.value = false));
}

function color(v: string) {
  if (v && v.indexOf('_OPEN') > -1) {
    return 'success';
  }
  return 'warning';
}

watchEffect(async () => {
  if (!ibcStore || ibcStore.commonIBCs.length === 0 || !connId.value) return;

  const findRes = await findMatchingConnection();
  if (!findRes) return;

  const cosmosClient = createCosmosClient(findRes.from);
  if (!cosmosClient) return;

  await Promise.all([
    fetchClientStatus(cosmosClient),
    fetchLatestBlockTime(cosmosClient),
    fetchIBCConnectionInfo(cosmosClient),
  ]);
});

async function findMatchingConnection() {
  const connections = await Promise.all(
    ibcStore.commonIBCs.map(async (ibc: { path: string; from: string }) => ({
      id: await ibcStore.getConnectionId(ibc.path),
      from: ibc.from,
    }))
  );
  return connections.find((r) => r.id === connId.value);
}

function createCosmosClient(from: string) {
  return CosmosRestClient.newDefault(
    `${getDynamicApiCosmosDirectory()}${from}`
  );
}

async function fetchClientStatus(cosmosClient: CosmosRestClient) {
  if (!conn.value?.counterparty?.client_id) return;
  try {
    clientFromStatus.value = await cosmosClient.getIBCClientStatusByClientId(
      conn.value?.counterparty?.client_id
    );
  } catch (e) {
    console.log(e);
  } finally {
    loadingStatusClientEffect.value = false;
  }
}

async function fetchLatestBlockTime(cosmosClient: CosmosRestClient) {
  const latestHeight =
    clientState.value?.client_state?.latest_height?.revision_height;
  if (!latestHeight) return;

  try {
    const block = await cosmosClient.getBaseBlockAt(latestHeight);
    lastUpdatedTo.value = block?.block?.header?.time;
  } catch (e) {
    console.log(e);
  } finally {
    loadingBlockHeightEffect.value = false;
  }
}

async function fetchIBCConnectionInfo(cosmosClient: CosmosRestClient) {
  const counterpartyConnectionId = conn.value?.counterparty?.connection_id;
  if (!counterpartyConnectionId) return;

  try {
    connFrom.value = (
      await cosmosClient.getIBCConnectionsById(counterpartyConnectionId)
    ).connection;

    const clientStateFrom = await cosmosClient.getIBCConnectionsClientState(
      counterpartyConnectionId
    );
    const revisionHeight =
      clientStateFrom?.identified_client_state?.client_state?.latest_height
        ?.revision_height;

    if (revisionHeight) {
      lastUpdatedFrom.value = (
        await chainStore.rpc.getBaseBlockAt(revisionHeight)
      )?.block?.header?.time;
    }
  } catch (e) {
    console.log(e);
  } finally {
    loadingIbcConnection.value = false;
  }
}
</script>
<template>
  <div class="">
    <div class="px-4 pt-3 pb-4 bg-base-200 rounded mb-4 shadow">
      <div class="mx-auto max-w-7xl px-6 lg:!px-8">
        <dl class="grid grid-cols-1 gap-x-6 text-center lg:!grid-cols-3">
          <div class="mx-auto flex items-center">
            <div>
              <div
                class="order-first text-3xl font-semibold tracking-tight text-main mb-1"
              >
                {{ baseStore.latest?.block?.header?.chain_id }}
              </div>
              <div
                v-if="conn.client_id && clientStatus.status"
                class="flex gap-4 justify-between items-center"
              >
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ conn.client_id }}
                </div>
                <div
                  class="text-xs truncate relative py-2 px-4 rounded-full w-fit"
                  :class="
                    clientStatus.status === 'Active'
                      ? 'text-success'
                      : 'text-error'
                  "
                >
                  <span
                    class="inset-x-0 inset-y-0 opacity-10 absolute"
                    :class="
                      clientStatus.status === 'Active'
                        ? 'bg-success'
                        : 'bg-error'
                    "
                  ></span>
                  {{ clientStatus.status }}
                </div>
              </div>
              <div
                v-if="props.connection_id && conn.state"
                class="flex gap-4 justify-between items-center mt-3"
              >
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ props.connection_id }}
                </div>
                <div
                  class="text-xs truncate relative py-2 px-4 rounded-full w-fit"
                  :class="
                    conn.state?.indexOf('_OPEN') > -1
                      ? 'text-success'
                      : 'text-error'
                  "
                >
                  <span
                    class="inset-x-0 inset-y-0 opacity-10 absolute"
                    :class="
                      conn.state?.indexOf('_OPEN') > -1
                        ? 'bg-success'
                        : 'bg-error'
                    "
                  ></span>
                  {{ conn.state }}
                </div>
              </div>
              <div v-if="lastUpdatedTo" class="mt-3">
                Last updated: {{ format.toDay(lastUpdatedTo) }}
              </div>
            </div>
          </div>
          <div class="mx-auto flex items-center">
            <div :class="{ 'text-success': conn.state?.indexOf('_OPEN') > -1 }">
              <span class="text-lg rounded-full">&#x21cc;</span>
              <div class="text-c">
                {{ conn.state }}
              </div>
            </div>
          </div>
          <div class="mx-auto">
            <div
              v-if="clientState.client_state?.chain_id"
              class="order-first text-3xl font-semibold tracking-tight text-main mb-2"
            >
              {{ clientState.client_state?.chain_id }}
            </div>
            <div
              v-if="conn.counterparty?.client_id"
              class="flex gap-4 justify-between items-center"
            >
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ conn.counterparty?.client_id }}
              </div>
              <div
                class="text-xs truncate relative py-2 px-4 rounded-full w-fit"
                :class="
                  clientFromStatus.status === 'Active'
                    ? 'text-success'
                    : 'text-error'
                "
              >
                <span
                  v-if="loadingStatusClientEffect"
                  class="loading loading-spinner loading-sm"
                ></span>
                <span
                  class="inset-x-0 inset-y-0 opacity-10 absolute"
                  :class="
                    clientFromStatus.status === 'Active'
                      ? 'bg-success'
                      : 'bg-error'
                  "
                ></span>
                {{ clientFromStatus.status }}
              </div>
            </div>
            <div
              v-if="conn.counterparty?.connection_id"
              class="flex gap-4 justify-between items-center mt-3"
            >
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ conn.counterparty?.connection_id }}
              </div>
              <div
                class="text-xs truncate relative py-2 px-4 rounded-full w-fit"
                :class="
                  connFrom.state?.indexOf('_OPEN') > -1
                    ? 'text-success'
                    : 'text-error'
                "
              >
                <span
                  v-if="loadingIbcConnection"
                  class="loading loading-spinner loading-sm"
                ></span>
                <span
                  class="inset-x-0 inset-y-0 opacity-10 absolute"
                  :class="
                    connFrom.state?.indexOf('_OPEN') > -1
                      ? 'bg-success'
                      : 'bg-error'
                  "
                ></span>
                {{ connFrom.state }}
              </div>
            </div>
            <div v-if="lastUpdatedFrom" class="mt-3">
              Last updated: {{ format.toDay(lastUpdatedFrom) }}
            </div>
          </div>
        </dl>
      </div>
    </div>

    <div class="bg-base-100 px-4 pt-3 pb-4 rounded mb-4 shadow">
      <h2 class="card-title mb-4 overflow-hidden">
        {{ $t('ibc.title_2')
        }}<span class="ml-2 text-sm">{{
          clientState.client_state?.['@type']
        }}</span>
      </h2>
      <div class="overflow-x-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <table class="table table-sm capitalize">
          <thead class="bg-base-200">
            <tr>
              <td colspan="3">{{ $t('ibc.trust_parameters') }}</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="w-52">{{ $t('ibc.trust_level') }}:</td>
              <td>
                {{ clientState.client_state?.trust_level?.numerator }}/{{
                  clientState.client_state?.trust_level?.denominator
                }}
              </td>
            </tr>
            <tr>
              <td class="w-52">{{ $t('ibc.trusting_period') }}:</td>
              <td>
                {{ formatSeconds(clientState.client_state?.trusting_period) }}
              </td>
            </tr>
            <tr>
              <td class="w-52">{{ $t('ibc.unbonding_period') }}:</td>
              <td>
                {{ formatSeconds(clientState.client_state?.unbonding_period) }}
              </td>
            </tr>
            <tr>
              <td class="w-52">{{ $t('ibc.max_clock_drift') }}:</td>
              <td>
                {{ formatSeconds(clientState.client_state?.max_clock_drift) }}
              </td>
            </tr>
            <tr>
              <td class="w-52">{{ $t('ibc.frozen_height') }}:</td>
              <td>{{ clientState.client_state?.frozen_height }}</td>
            </tr>
            <tr>
              <td class="w-52">{{ $t('ibc.latest_height') }}:</td>
              <td>{{ clientState.client_state?.latest_height }}</td>
            </tr>
          </tbody>
        </table>
        <table class="table table-sm text-sm w-full capitalize">
          <thead class="bg-base-200">
            <tr>
              <td colspan="2">{{ $t('ibc.upgrade_parameters') }}</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="2">
                <div class="flex justify-between">
                  <span>{{ $t('ibc.allow_update_after_expiry') }}:</span>
                  <span>{{
                    clientState.client_state?.allow_update_after_expiry
                  }}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <div class="flex justify-between">
                  <span>{{ $t('ibc.allow_update_after_misbehaviour') }}: </span>
                  <span>{{
                    clientState.client_state?.allow_update_after_misbehaviour
                  }}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td class="w-52">{{ $t('ibc.upgrade_path') }}:</td>
              <td class="text-right">
                {{ clientState.client_state?.upgrade_path.join(', ') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="bg-base-100 px-4 pt-3 pb-4 rounded mb-4 shadow overflow-hidden">
      <h2 class="card-title">{{ $t('ibc.channels') }}</h2>
      <div class="overflow-auto">
        <table class="table w-full mt-4">
          <thead>
            <tr>
              <th>{{ $t('ibc.txs') }}</th>
              <th style="position: relative; z-index: 2">
                {{ $t('ibc.channel_id') }}
              </th>
              <th>{{ $t('ibc.port_id') }}</th>
              <th>{{ $t('ibc.state') }}</th>
              <th>{{ $t('ibc.counterparty') }}</th>
              <th>{{ $t('ibc.hops') }}</th>
              <th>{{ $t('ibc.version') }}</th>
              <th>{{ $t('ibc.ordering') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(v, index) in ibcStore.registryChannels"
              :key="'registryChannels' + index"
            >
              <td>
                <div class="flex gap-1">
                  <button
                    class="btn btn-xs"
                    @click="
                      fetchSendingTxs(
                        v[ibcStore.sourceField].channel_id,
                        v[ibcStore.sourceField].port_id
                      )
                    "
                    :disabled="loading"
                  >
                    <span
                      v-if="loading"
                      class="loading loading-spinner loading-sm"
                    ></span>
                    {{ $t('ibc.btn_out') }}
                  </button>
                  <button
                    class="btn btn-xs"
                    @click="
                      fetchRecevingTxs(
                        v[ibcStore.sourceField].channel_id,
                        v[ibcStore.sourceField].port_id
                      )
                    "
                    :disabled="loading"
                  >
                    <span
                      v-if="loading"
                      class="loading loading-spinner loading-sm"
                    ></span>
                    {{ $t('ibc.btn_in') }}
                  </button>
                </div>
              </td>
              <td>
                <a href="#">{{ v[ibcStore.sourceField].channel_id }}</a>
              </td>
              <td>{{ v[ibcStore.sourceField].port_id }}</td>
            </tr>
            <tr v-for="(v, index) in channels" :key="'channel' + index">
              <td>
                <div class="flex gap-1">
                  <button
                    class="btn btn-xs"
                    @click="fetchSendingTxs(v.channel_id, v.port_id)"
                    :disabled="loading"
                  >
                    <span
                      v-if="loading"
                      class="loading loading-spinner loading-sm"
                    ></span>
                    {{ $t('ibc.btn_out') }}
                  </button>
                  <button
                    class="btn btn-xs"
                    @click="fetchRecevingTxs(v.channel_id, v.port_id)"
                    :disabled="loading"
                  >
                    <span
                      v-if="loading"
                      class="loading loading-spinner loading-sm"
                    ></span>
                    {{ $t('ibc.btn_in') }}
                  </button>
                </div>
              </td>
              <td>
                <a href="#" @click="loadChannel(v.channel_id, v.port_id)">{{
                  v.channel_id
                }}</a>
              </td>
              <td>{{ v.port_id }}</td>
              <td>
                <div
                  class="text-xs truncate relative py-2 px-4 rounded-full w-fit"
                  :class="`text-${color(v.state)}`"
                >
                  <span
                    class="inset-x-0 inset-y-0 opacity-10 absolute"
                    :class="`bg-${color(v.state)}`"
                  ></span>
                  {{ v.state }}
                </div>
              </td>
              <td>
                {{ v.counterparty?.port_id }}/{{ v.counterparty?.channel_id }}
              </td>
              <td>{{ v.connection_hops.join(', ') }}</td>
              <td>{{ v.version }}</td>
              <td>{{ v.ordering }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-if="channel_id">
      <h3 class="card-title capitalize">
        Transactions ({{ channel_id }} {{ port_id }} {{ direction }})
      </h3>
      <table class="table">
        <thead>
          <tr>
            <td>{{ $t('ibc.height') }}</td>
            <td>{{ $t('ibc.txhash') }}</td>
            <td>{{ $t('ibc.messages') }}</td>
            <td>{{ $t('ibc.time') }}</td>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(resp, index) in txs?.tx_responses"
            :key="'tx_responses' + index"
          >
            <td>{{ resp.height }}</td>
            <td>
              <div class="text-xs truncate text-primary dark:invert">
                <RouterLink
                  :to="`/${chainStore.chainName}/tx/${resp.txhash}`"
                  >{{ resp.txhash }}</RouterLink
                >
              </div>
            </td>
            <td>
              <div class="flex">
                {{ format.messages(resp.tx.body.messages) }}
                <Icon
                  v-if="resp.code === 0"
                  icon="mdi-check"
                  class="text-success text-lg"
                />
                <Icon v-else icon="mdi-multiply" class="text-error text-lg" />
              </div>
            </td>
            <td>{{ format.toLocaleDate(resp.timestamp) }}</td>
          </tr>
        </tbody>
      </table>
      <PaginationBar
        :limit="page.limit"
        :total="txs.pagination?.total"
        :callback="pageload"
      />
    </div>
  </div>
</template>
