<script lang="ts" setup>
import { Decimal, Uint32 } from '@cosmjs/math';
import type { MsgSetRateEncodeObject } from '@cosmjs/stargate';
import BigNumber from 'bignumber.js';
import { MsgSetRate } from 'cosmjs-types/titan/validatorreward/tx';
import { computed, ref, type PropType } from 'vue';

import { getStakingParam, getValidatorRewardParams } from '@/libs/utils/http';
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
const rate = ref('');

const msgs = computed(() => {

  const rateString = (BigNumber(rate.value).div(100)).toString();

  const msg: MsgSetRateEncodeObject = {
    typeUrl: '/titan.validatorreward.MsgSetRate',
    value: MsgSetRate.fromPartial({
      authority: props.sender,
      rate: Decimal.fromUserInput(rateString, 18).atomics,
    }),
  };

  return [msg];
});


const isValid = computed(() => {
  let ok = true;
  let error = '';
  if (!rate.value) {
    ok = false;
    error = 'Commission Rate is empty';
  }

  // ensure `commissionRate` is a percentage
  if (Number(rate.value) < 0 || Number(rate.value) > 100) {
    ok = false;
    error = 'Commission Rate should be between 0 and 100';
  }

  return { ok, error };
});

function initial() {
  getStakingParam(props.endpoint).then((x) => {
    stakingDenom.value = x.params.bond_denom;
  });
  getValidatorRewardParams(props.endpoint).then((x) => {
    console.log('x.params.rate', x.params.rate)
    rate.value = Decimal.fromUserInput(x.params.rate, 18).multiply(Uint32.fromString('100')).toString();
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
        <span class="label-text">APR</span>
      </label>
      <div class="flex">
        <input
          v-model="rate"
          type="number"
          class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600 flex-grow"
        />
        <span class="self-center ml-2">%</span>
      </div>
    </div>

  </div>
</template>
<script lang="ts">
export default {
  name: 'Delegate',
};
</script>
