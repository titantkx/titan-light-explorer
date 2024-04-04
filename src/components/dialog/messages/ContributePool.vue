<script lang="ts" setup>
import { MsgFundRewardPool } from 'cosmjs-types/titan/validatorreward/tx';
import { computed, ref, type PropType } from 'vue';

import { getStakingParam } from '@/libs/utils/http';
import type { MsgFundRewardPoolEncodeObject } from '@cosmjs/stargate';
import { TokenUnitConverter } from '../../../libs/utils/TokenUnitConverter';
import type { Coin, CoinMetadata } from '../../../libs/utils/type';

const props = defineProps({
  endpoint: { type: String, required: true },
  sender: { type: String, required: true },
  balances: Object as PropType<Coin[]>,
  metadata: Object as PropType<Record<string, CoinMetadata>>,
  params: String,
});
const params = computed(() => JSON.parse(props.params || '{}'));

const stakingDenom = ref('');
const amount = ref('');
const amountDenom = ref('');

const msgs = computed(() => {
  const convert = new TokenUnitConverter(props.metadata);

  const msg: MsgFundRewardPoolEncodeObject = {
    typeUrl: '/titan.validatorreward.MsgFundRewardPool',
    value: MsgFundRewardPool.fromPartial({
      depositor: props.sender,
      amount: [
        convert.displayToBase(stakingDenom.value, {
          amount: String(amount.value),
          denom: amountDenom.value,
        }),
      ],
    }),
  };

  return [msg];
});

const available = computed(() => {
  const convert = new TokenUnitConverter(props.metadata);
  const base = props.balances?.find((x) => x.denom === stakingDenom.value) || {
    amount: '0',
    denom: stakingDenom.value,
  };
  return {
    base,
    display: convert.baseToUnit(base, amountDenom.value),
  };
});

const units = computed(() => {
  if (!props.metadata || !props.metadata[stakingDenom.value]) {
    amountDenom.value = stakingDenom.value;
    return [{ denom: stakingDenom.value, exponent: 0, aliases: [] }];
  }
  const list = props.metadata[stakingDenom.value].denom_units.sort(
    (a, b) => b.exponent - a.exponent
  );
  if (list.length > 0) amountDenom.value = list[0].denom;
  return list;
});

const isValid = computed(() => {
  let ok = true;
  let error = '';
  if (!(Number(amount.value) > 0)) {
    ok = false;
    error = 'Amount should be great than 0';
  }
  if (!amountDenom.value) {
    ok = false;
    error = 'Amount Denom is empty';
  }

  return { ok, error };
});

function initial() {
  getStakingParam(props.endpoint).then((x) => {
    stakingDenom.value = x.params.bond_denom;
  });
}

defineExpose({ msgs, isValid, initial });
</script>
<template>
  <div>
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
        <span class="label-text">Amount</span>
        <span>
          {{ available?.display.amount }} {{ available?.display.denom }}
        </span>
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
  name: 'Delegate',
};
</script>
