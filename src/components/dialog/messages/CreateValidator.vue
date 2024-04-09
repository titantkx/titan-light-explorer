<script lang="ts" setup>
import { accountToValoper } from '@/libs/address';
import type { Ed25519Pubkey } from '@cosmjs/amino';
import { Decimal } from '@cosmjs/math';
import { encodePubkey } from '@cosmjs/proto-signing';
import type {
MsgCreateValidatorEncodeObject,
MsgCreateValidatorForOtherEncodeObject,
} from '@cosmjs/stargate';
import BigNumber from 'bignumber.js';
import {
MsgCreateValidator,
MsgCreateValidatorForOther,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx';
import { computed, ref, type PropType } from 'vue';
import { TokenUnitConverter } from '../../../libs/utils/TokenUnitConverter';
import { getStakingParam } from '../../../libs/utils/http';
import type { Coin, CoinMetadata } from '../../../libs/utils/type';

const props = defineProps({
  endpoint: { type: String, required: true },
  sender: { type: String, required: true },
  balances: Object as PropType<Coin[]>,
  metadata: Object as PropType<Record<string, CoinMetadata>>,
  params: String,
});
const params = computed(() => JSON.parse(props.params || '{}'));

const delegator = ref('');
const publicKey = ref('');
const commissionRate = ref('');

const moniker = ref('');
const identity = ref('');
const website = ref('');
const securityContact = ref('');
const details = ref('');

const stakingDenom = ref('');
const unbondingTime = ref('');
const globalMinSelfDelegation = ref('');
const amount = ref('');
const amountDenom = ref('');

const msgs = computed(() => {
  const convert = new TokenUnitConverter(props.metadata);

  // calculate `validatorAddress` from `delegatorAddress`
  const validatorAddress = accountToValoper(delegator.value);
  const pk: Ed25519Pubkey = {
    type: 'tendermint/PubKeyEd25519',
    value: publicKey.value,
  };
  const commissionRateString = BigNumber(commissionRate.value)
    .div(100)
    .toString();

  if (props.sender !== delegator.value) {
    // This is create validator for other
    const msg: MsgCreateValidatorForOtherEncodeObject = {
      typeUrl: '/cosmos.staking.v1beta1.MsgCreateValidatorForOther',
      value: MsgCreateValidatorForOther.fromPartial({
        description: {
          moniker: moniker.value,
          identity: identity.value,
          website: website.value,
          securityContact: securityContact.value,
          details: details.value,
        },
        commission: {
          rate: Decimal.fromUserInput(commissionRateString, 18).atomics,
          maxRate: Decimal.fromUserInput('0.2', 18).atomics,
          maxChangeRate: Decimal.fromUserInput('0.01', 18).atomics,
        },
        minSelfDelegation: globalMinSelfDelegation.value,
        payerAddress: props.sender,
        delegatorAddress: delegator.value,
        validatorAddress,
        pubkey: encodePubkey(pk),
        value: convert.displayToBase(stakingDenom.value, {
          amount: String(amount.value),
          denom: amountDenom.value,
        }),
      }),
    };

    return [msg];
  } else {
    // This is create validator for self
    const msg: MsgCreateValidatorEncodeObject = {
      typeUrl: '/cosmos.staking.v1beta1.MsgCreateValidator',
      value: MsgCreateValidator.fromPartial({
        description: {
          moniker: moniker.value,
          identity: identity.value,
          website: website.value,
          securityContact: securityContact.value,
          details: details.value,
        },
        commission: {
          rate: Decimal.fromUserInput(commissionRateString, 18).atomics,
          maxRate: Decimal.fromUserInput('0.2', 18).atomics,
          maxChangeRate: Decimal.fromUserInput('0.01', 18).atomics,
        },
        minSelfDelegation: globalMinSelfDelegation.value,
        delegatorAddress: props.sender,
        validatorAddress,
        pubkey: encodePubkey(pk),
        value: convert.displayToBase(stakingDenom.value, {
          amount: String(amount.value),
          denom: amountDenom.value,
        }),
      }),
    };

    return [msg];
  }
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
  const convert = new TokenUnitConverter(props.metadata);

  let ok = true;
  let error = '';
  if (!delegator.value) {
    ok = false;
    error = 'Delegator is empty';
  }
  if (!publicKey.value) {
    ok = false;
    error = 'Public Key is empty';
  }
  // validate `publicKey` is base64
  if (!/^[A-Za-z0-9+/]{43}=$/.test(publicKey.value)) {
    ok = false;
    error = 'Public Key is invalid';
  }
  if (!(Number(amount.value) > 0)) {
    ok = false;
    error = 'Amount should be great than 0';
  }
  if (!amountDenom.value) {
    ok = false;
    error = 'Amount Denom is empty';
  }

  const globalMinSelfDelegateToCompare = convert.baseToUnit(
    {
      amount: globalMinSelfDelegation.value,
      denom: stakingDenom.value,
    },
    amountDenom.value
  );

  // validate `amount` is greater than `globalMinSelfDelegation`
  if (
    BigNumber(amount.value) < BigNumber(globalMinSelfDelegateToCompare.amount)
  ) {
    ok = false;
    error = `Amount should be great than or equal global min self delegation ${globalMinSelfDelegateToCompare.amount} ${amountDenom.value}`;
  }

  if (!commissionRate.value) {
    ok = false;
    error = 'Commission Rate is empty';
  }

  // ensure `commissionRate` is a percentage
  if (Number(commissionRate.value) < 0 || Number(commissionRate.value) > 100) {
    ok = false;
    error = 'Commission Rate should be between 0 and 100';
  }

  if (!moniker.value) {
    ok = false;
    error = 'Moniker is empty';
  }
  return { ok, error };
});

function initial() {
  getStakingParam(props.endpoint).then((x) => {
    stakingDenom.value = x.params.bond_denom;
    unbondingTime.value = x.params.unbonding_time;
    globalMinSelfDelegation.value = x.params.global_min_self_delegation;
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
        <span class="label-text">Delegator</span>
      </label>
      <input
        v-model="delegator"
        type="text"
        class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
      />
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Public Key</span>
      </label>
      <input
        v-model="publicKey"
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

    <div class="form-control">
      <label class="label">
        <span class="label-text">Commission Rate</span>
      </label>
      <div class="flex">
        <input
          v-model="commissionRate"
          type="number"
          class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600 flex-grow"
        />
        <span class="self-center ml-2">%</span>
      </div>
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Moniker</span>
      </label>
      <input
        v-model="moniker"
        type="text"
        class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
      />
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Identity</span>
      </label>
      <input
        v-model="identity"
        type="text"
        class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
      />
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Website</span>
      </label>
      <input
        v-model="website"
        type="text"
        class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
      />
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Security Contact</span>
      </label>
      <input
        v-model="securityContact"
        type="text"
        class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
      />
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Details</span>
      </label>
      <input
        v-model="details"
        type="text"
        class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
      />
    </div>
  </div>
</template>
<script lang="ts">
export default {
  name: 'Delegate',
};
</script>
