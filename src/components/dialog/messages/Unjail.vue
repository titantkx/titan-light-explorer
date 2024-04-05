<script lang="ts" setup>
import { MsgUnjail } from 'cosmjs-types/cosmos/slashing/v1beta1/tx';
import { computed, ref, type PropType } from 'vue';

import { accountToValoper } from '@/libs';
import { getStakingParam } from '@/libs/utils/http';
import type { MsgUnjailEncodeObject } from '@cosmjs/stargate/build/modules';
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

const msgs = computed(() => {
  const msg: MsgUnjailEncodeObject = {
    typeUrl: '/cosmos.slashing.v1beta1.MsgUnjail',
    value: MsgUnjail.fromPartial({
      validatorAddr: accountToValoper(props.sender),
    }),
  };

  return [msg];
});

const isValid = computed(() => {
  let ok = true;
  let error = '';

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

    <div class="form-control"></div>
  </div>
</template>
<script lang="ts">
export default {
  name: 'Delegate',
};
</script>
