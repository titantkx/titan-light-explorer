<script lang="ts" setup>
import { computed, ref, type PropType } from 'vue';
import { TokenUnitConverter } from '../../../libs/utils/TokenUnitConverter';
import type { Coin, CoinMetadata } from '../../../libs/utils/type';

const props = defineProps({
  endpoint: { type: String, required: true },
  sender: { type: String, required: true },
  balances: Object as PropType<Coin[]>,
  metadata: Object as PropType<Record<string, CoinMetadata>>,
  params: Object,
});

const amount = ref('');
const recipient = ref('');
const denom = ref('');
const amountDenom = ref('');

const msgs = computed(() => {
  const convert = new TokenUnitConverter(props.metadata);
  return [
    {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: props.sender,
        toAddress: recipient.value?.toLowerCase(),
        amount: [
          convert.displayToBase(denom.value, {
            amount: String(amount.value),
            denom: amountDenom.value,
          }),
        ],
      },
    },
  ];
});

const available = computed(() => {
  const base = props.balances?.find((x) => x.denom === denom.value) || {
    amount: '0',
    denom: '-',
  };
  const convert = new TokenUnitConverter(props.metadata);
  return {
    base,
    display: convert.baseToUnit(base, amountDenom.value),
  };
});

const showBalances = computed(() => {
  const convert = new TokenUnitConverter(props.metadata);
  return (
    props.balances?.map((b) => ({
      base: b,
      display: convert.baseToDisplay(b),
    })) || []
  );
});

const units = computed(() => {
  if (!props.metadata || !props.metadata[denom.value]) {
    amountDenom.value = denom.value;
    return [{ denom: denom.value, exponent: 0, aliases: [] }];
  }
  const list = props.metadata[denom.value].denom_units.sort(
    (a, b) => b.exponent - a.exponent
  );
  if (list.length > 0) amountDenom.value = list[0].denom;
  return list;
});

const isValid = computed(() => {
  let ok = true;
  let error = '';
  if (!recipient.value) {
    ok = false;
    error = 'Recipient is empty';
  }
  if (!(Number(amount.value) > 0)) {
    ok = false;
    error = 'Amount should be great than 0';
  }
  return { ok, error };
});

function initial() {
  // console.log(props, 'test');
  denom.value = props.params?.fees?.denom || '';
  // getStakingParam(props.endpoint).then((x) => {
  //     denom.value = x.params?.bond_denom;
  // });
}

function formatDenom(v: any) {
  return String(v).substring(0, 10);
}

defineExpose({ msgs, isValid, initial });
</script>
<template>
  <div class="dark:text-gray-400">
    <div class="form-control">
      <label class="label">
        <span class="label-text">Sender</span>
      </label>
      <input
        :value="sender"
        type="text"
        class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
      />
    </div>
    <div class="form-control">
      <label class="label">
        <span class="label-text">Balances</span>
      </label>
      <select v-model="denom" class="select select-bordered dark:text-white">
        <option value="">Select a token</option>
        <option
          v-for="({ base, display }, index) in showBalances"
          :value="base.denom"
          :key="'showBalances' + index"
        >
          {{ display.amount }} {{ display.denom }}
        </option>
      </select>
    </div>
    <div class="form-control">
      <label class="label">
        <span class="label-text">Recipient</span>
      </label>
      <input
        v-model="recipient"
        type="text"
        class="input border border-gray-300 dark:border-gray-600 dark:text-white"
      />
    </div>
    <div class="form-control">
      <label class="label">
        <span class="label-text">Amount</span>
        <span
          >{{ available.display.amount }}
          {{ formatDenom(available.display.denom) }}</span
        >
      </label>
      <label class="join">
        <input
          v-model="amount"
          type="number"
          :placeholder="`Available: ${available?.display.amount}`"
          class="input border border-gray-300 dark:border-gray-600 w-full join-item dark:text-white"
        />
        <select
          v-model="amountDenom"
          class="select select-bordered join-item dark:text-white"
        >
          <option v-for="(u, index) in units" :key="'unit' + index">
            {{ u.denom }}
          </option>
        </select>
      </label>
    </div>
  </div>
</template>
<script lang="ts">
export default {
  name: 'Send',
};
</script>
