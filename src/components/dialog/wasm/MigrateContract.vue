<script lang="ts" setup>
import { computed, ref } from 'vue';

const props = defineProps({
  endpoint: { type: String, required: true },
  sender: { type: String, required: true },
  params: String,
});

const params = computed(() => JSON.parse(props.params || '{}'));

const codeId = ref('');
const msg = ref('{}');

const msgs = computed(() => {
  return [
    {
      typeUrl: '/cosmwasm.wasm.v1.MsgMigrateContract',
      value: {
        /** Sender is the that actor that signed the messages */
        sender: props.sender,
        /** contract address that can execute migrations */
        contract: params.value.contract,
        /** CodeID is the reference to the stored WASM code */
        codeId: codeId.value,
        /** Msg json encoded message to be passed to the contract on instantiation */
        msg: new TextEncoder().encode(msg.value),
      },
    },
  ];
});

const isValid = computed(() => {
  let ok = true;
  let error = '';
  if (Number(codeId.value) < 1) {
    ok = false;
    error = 'Code Id is not selected';
  }
  return { ok, error };
});

function initial() {}

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
        <span class="label-text">Contract Address</span>
      </label>
      <input
        type="text"
        readonly
        class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
        :value="params.contract"
      />
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Code Id</span>
      </label>
      <input
        v-model="codeId"
        type="text"
        class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
      />
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Messages</span>
      </label>
      <textarea
        v-model="msg"
        placeholder="{config: {}}"
        class="text-gray-600 dark:text-white textarea border !border-gray-300 dark:!border-gray-600"
      ></textarea>
    </div>
  </div>
</template>
<script lang="ts">
export default {
  name: 'MigrateContract',
};
</script>
