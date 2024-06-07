<script lang="ts" setup>
import { computed, onUpdated, ref, type ComputedRef, type PropType } from 'vue';
import { TokenUnitConverter } from '../../../libs/utils/TokenUnitConverter';
import { decimal2percent } from '../../../libs/utils/format';
import {
  getActiveValidators,
  getDelegations,
  getStakingParam,
} from '../../../libs/utils/http';
import type { Coin, CoinMetadata } from '../../../libs/utils/type';
const props = defineProps({
  endpoint: { type: String, required: true },
  sender: { type: String, required: true },
  balances: Object as PropType<Coin[]>,
  metadata: Object as PropType<Record<string, CoinMetadata>>,
  params: String,
});
const params: any = computed(() => JSON.parse(props.params || '{}'));

const validator = ref('');

const activeValidators = ref([]);
const inactiveValidators = ref([]);
const stakingDenom = ref('');
const amount = ref('');
const amountDenom = ref('');
const delegation = ref({} as Coin);
const error = ref('');

const sourceValidator = computed(() => {
  // @ts-ignore
  const activeValidator: any = activeValidators.value.find(
    (v: any) => v.operator_address === params.validator_address
  );
  if (activeValidator) {
    // @ts-ignore
    return `${v.description.moniker} (${decimal2percent(
      activeValidator.commission.commission_rates.rate
    )}%)`;
  }
  return params.value.validator_address;
});

const msgs = computed(() => {
  const convert = new TokenUnitConverter(props.metadata);
  return [
    {
      typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
      value: {
        delegatorAddress: props.sender,
        validatorSrcAddress: params.value.validator_address,
        validatorDstAddress: validator.value,
        amount: convert.displayToBase(delegation.value.denom, {
          amount: String(amount.value),
          denom: amountDenom.value,
        }),
      },
    },
  ];
});

const list: ComputedRef<
  {
    operator_address: string;
    description: { moniker: string };
    commission: { commission_rates: { rate: string } };
    status: string;
  }[]
> = computed(() => {
  return [...activeValidators.value, ...inactiveValidators.value];
});

const available = computed(() => {
  const convert = new TokenUnitConverter(props.metadata);
  const base = delegation.value || { amount: '0', denom: stakingDenom.value };
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

  if (!validator.value) {
    ok = false;
    error = 'Destination Validator is empty';
  }
  if (!(Number(amount.value) > 0)) {
    ok = false;
    error = 'Amount should be great than 0';
  }
  return { ok, error };
});

function initial() {
  getDelegations(props.endpoint, params.value.validator_address, props.sender)
    .then((x) => {
      delegation.value = x.delegation_response.balance;
    })
    .catch((err) => {
      error.value = err;
    });

  getStakingParam(props.endpoint).then((x) => {
    stakingDenom.value = x.params.bond_denom;
    // unbondingTime.value = x.params.unbonding_time;
  });

  getActiveValidators(props.endpoint).then((x) => {
    activeValidators.value = x.validators;
    validator.value = x.validators.find(
      (v: any) => v.description.identity === '6783E9F948541962'
    )?.operator_address;
  });
}

onUpdated(() => (validator.value = list.value[0]?.operator_address));

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
        <span class="label-text">Source Validator</span>
      </label>
      <input
        :value="sourceValidator"
        type="text"
        class="input border border-gray-300 dark:border-gray-600 dark:text-white"
        readonly
      />
    </div>
    <div class="form-control">
      <label class="label">
        <span class="label-text">Destination Validator</span>
      </label>
      <select
        v-model="validator"
        class="select select-bordered dark:text-white"
        placeholder="Select a validator"
      >
        <option selected disabled>Select a validator</option>
        <option
          v-for="(v, index) in list"
          :value="v.operator_address"
          :key="'operator_address' + index"
        >
          {{ v.description.moniker }} ({{
            decimal2percent(v.commission.commission_rates.rate)
          }}%)
          <span v-if="v.status !== 'BOND_STATUS_BONDED'">x</span>
        </option>
      </select>
    </div>
    <div class="form-control">
      <label class="label">
        <span class="label-text">Amount</span>
        <span
          >Available: {{ available?.display.amount
          }}{{ available?.display.denom }}</span
        >
      </label>
      <label class="input-group">
        <input
          v-model="amount"
          type="number"
          :placeholder="`Input amount: ${available?.display.amount} ${available?.display.denom}`"
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
    <div class="text-error">
      {{ error }}
    </div>
  </div>
</template>
<script lang="ts">
export default {
  name: 'Redelegate',
};
</script>
