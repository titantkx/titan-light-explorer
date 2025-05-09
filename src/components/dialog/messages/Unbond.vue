<script lang="ts" setup>
import { computed, ref, type PropType } from 'vue';
import { TokenUnitConverter } from '../../../libs/utils/TokenUnitConverter';
import { getDelegations } from '../../../libs/utils/http';
import type { Coin, CoinMetadata } from '../../../libs/utils/type';

const props = defineProps({
  endpoint: { type: String, required: true },
  sender: { type: String, required: true },
  metadata: Object as PropType<Record<string, CoinMetadata>>,
  params: String,
});

const params = computed(() => JSON.parse(props.params || '{}'));
const delegation = ref(
  {} as {
    balance: Coin;
    delegation: {
      delegator_address: string;
      shares: string;
      validator_address: string;
    };
  }
);
const amount = ref('');
const amountDenom = ref('');
const error = ref('');

const msgs = computed(() => {
  const convert = new TokenUnitConverter(props.metadata);
  return [
    {
      typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
      value: {
        delegatorAddress: props.sender,
        validatorAddress: params.value.validator_address,
        amount: convert.displayToBase(delegation.value.balance?.denom, {
          amount: String(amount.value),
          denom: amountDenom.value,
        }),
      },
    },
  ];
});

const units = computed(() => {
  const denom = delegation.value.balance?.denom;
  if (!props.metadata || !props.metadata[denom]) {
    amountDenom.value = denom;
    return [{ denom: denom, exponent: 0, aliases: [] }];
  }
  const list = props.metadata[denom].denom_units.sort(
    (a, b) => b.exponent - a.exponent
  );
  if (list.length > 0) amountDenom.value = list[0].denom;
  return list;
});

const isValid = computed(() => {
  const convert = new TokenUnitConverter(props.metadata);
  const base = delegation.value?.balance || { amount: '', denom: '' };
  const maxValueInput = convert.baseToUnit(base, amountDenom.value);

  let ok = true;
  let error = '';
  if (!props.sender) {
    ok = false;
    error = 'Sender is empty';
  }
  if (!params.value.validator_address) {
    ok = false;
    error = 'Validator is empty';
  }
  if (!(Number(amount.value) > 0)) {
    ok = false;
    error = 'Amount should be great than 0';
  }
  if (Number(amount.value) > Number(maxValueInput.amount)) {
    ok = false;
    error = `Amount should be less than or equal ${maxValueInput.amount}`;
  }
  return { ok, error };
});

function initial() {
  getDelegations(props.endpoint, params.value.validator_address, props.sender)
    .then((x) => {
      delegation.value = x.delegation_response;
    })
    .catch((err) => {
      error.value = err;
    });
}

const available = computed(() => {
  const convert = new TokenUnitConverter(props.metadata);
  const base = delegation.value?.balance || { amount: '', denom: '' };
  return {
    base,
    display: convert.baseToUnit(base, amountDenom.value),
  };
});

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
      </label>
      <label class="input-group">
        <input
          v-model="amount"
          type="number"
          :placeholder="`Avaiable: ${available.display?.amount}`"
          class="input border border-gray-300 dark:border-gray-600 w-full dark:text-white"
        />
        <select
          v-model="amountDenom"
          class="select select-bordered dark:text-white"
        >
          <option v-for="(u, index) in units" :key="'unit' + index">
            {{ u.denom }}
          </option>
        </select>
      </label>
    </div>
    <div class="text-error">{{ error }}</div>
  </div>
</template>
<script lang="ts">
export default {
  name: 'Unbond',
};
</script>
