<script lang="ts" setup>
import { computed, onUpdated, ref, type ComputedRef, type PropType } from 'vue';
import { TokenUnitConverter } from '../../../libs/utils/TokenUnitConverter';
import { decimal2percent } from '../../../libs/utils/format';
import {
  getActiveValidators,
  getInactiveValidators,
  getStakingParam,
  getUnbondingValidators,
} from '../../../libs/utils/http';
import type { Coin, CoinMetadata } from '../../../libs/utils/type';

const props = defineProps({
  endpoint: { type: String, required: true },
  sender: { type: String, required: true },
  balances: Object as PropType<Coin[]>,
  metadata: Object as PropType<Record<string, CoinMetadata>>,
  params: String,
});
const params = computed(() => JSON.parse(props.params || '{}'));

const validator = ref('');

const activeValidators = ref([]);
const unbondingValidators = ref([]);
const inactiveValidators = ref([]);
const stakingDenom = ref('');
const unbondingTime = ref('');
const amount = ref('');
const amountDenom = ref('');

const msgs = computed(() => {
  const convert = new TokenUnitConverter(props.metadata);
  return [
    {
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      value: {
        delegatorAddress: props.sender,
        validatorAddress: validator.value,
        amount: convert.displayToBase(stakingDenom.value, {
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
  return [
    ...activeValidators.value,
    ...unbondingValidators.value,
    ...inactiveValidators.value,
  ];
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

function loadInactiveValidators() {
  getUnbondingValidators(props.endpoint).then((x) => {
    unbondingValidators.value = x.validators;
  });
  getInactiveValidators(props.endpoint).then((x) => {
    inactiveValidators.value = x.validators;
  });
}

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
    error = 'Validator is empty';
  }

  if (!(Number(amount.value) > 0)) {
    ok = false;
    error = 'Amount should be great than 0';
  }

  if (Number(amount.value) > Number(available.value?.display?.amount)) {
    ok = false;
    error = 'Insufficient balance';
  }

  if (!amountDenom.value) {
    ok = false;
    error = 'Amount Denom is empty';
  }
  return { ok, error };
});

function initial() {
  activeValidators.value = [];
  validator.value = params.value.validator_address;
  getStakingParam(props.endpoint).then((x) => {
    stakingDenom.value = x.params.bond_denom;
    unbondingTime.value = x.params.unbonding_time;
  });

  getActiveValidators(props.endpoint).then((x) => {
    activeValidators.value = x.validators;
    if (params.value.validator_address) {
      // if do not found => loadInactiveValidators
      if (
        !x.validators.find(
          (v: any) => v.operator_address === params.value.validator_address
        )
      ) {
        loadInactiveValidators();
      }
    }
  });
}

onUpdated(() => {
  if (!validator.value) {
    validator.value = list.value[0]?.operator_address;
  }
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
        <span class="label-text">Validator</span>
        <a class="label-text" @click="loadInactiveValidators()"
          >Show Inactive</a
        >
      </label>
      <select
        v-model="validator"
        class="select select-bordered dark:text-white"
      >
        <option value="" disabled>Select a validator</option>
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
        <span>
          Available: {{ available?.display.amount }}
          {{ available?.display.denom }}
        </span>
      </label>
      <label class="join">
        <input
          v-model="amount"
          type="number"
          :placeholder="`Input amount`"
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
