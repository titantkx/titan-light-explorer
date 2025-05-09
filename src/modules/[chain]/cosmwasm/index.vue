<script lang="ts" setup>
import router from '@/router';
import { useTxDialog } from '@/stores';
import { PageRequest } from '@/types';
import { ref } from 'vue';
import { useWasmStore } from './WasmStore';
import type { PaginabledCodeInfos } from './types';

const props = defineProps(['chain']);

const codes = ref({} as PaginabledCodeInfos);

const pageRequest = ref(new PageRequest());
const wasmStore = useWasmStore();
const dialog = useTxDialog();
const creator = ref('');

function pageload(key?: string) {
  pageRequest.value.count_total = false;
  pageRequest.value.key = key;
  wasmStore.wasmClient.getWasmCodeList(pageRequest.value).then((x) => {
    codes.value = x;
  });
}
pageload();

function myContracts() {
  router.push(`/${props.chain}/cosmwasm/${creator.value}/contracts`);
}
</script>
<template>
  <div class="bg-base-100 px-4 pt-3 pb-4 rounded mb-4 shadow">
    <h2 class="card-title truncate w-full">{{ $t('cosmwasm.title') }}</h2>

    <div class="join border border-primary">
      <input
        v-model="creator"
        type="text"
        class="input input-bordered w-40 join-item"
        placeholder="creator address"
      />
      <button class="join-item btn btn-primary" @click="myContracts()">
        {{ $t('cosmwasm.btn_query') }}
      </button>
    </div>
    <div class="overflow-x-auto">
      <table class="table table-compact w-full mt-4 text-sm">
        <thead>
          <tr>
            <th>{{ $t('cosmwasm.code_id') }}</th>
            <th>{{ $t('cosmwasm.code_hash') }}</th>
            <th>{{ $t('cosmwasm.creator') }}</th>
            <th>{{ $t('cosmwasm.permissions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(v, index) in codes.code_infos" :key="index">
            <td>{{ v.code_id }}</td>
            <td>
              <RouterLink
                :to="`/${props.chain}/cosmwasm/${v.code_id}/contracts`"
                class="truncate max-w-[200px] block text-primary dark:invert"
                :title="v.data_hash"
              >
                {{ v.data_hash }}
              </RouterLink>
            </td>
            <td>{{ v.creator }}</td>
            <td>
              {{ v.instantiate_permission?.permission }}
              <span
                >{{ v.instantiate_permission?.address }}
                {{ v.instantiate_permission?.addresses.join(', ') }}</span
              >
            </td>
          </tr>
        </tbody>
      </table>
      <div class="flex justify-between">
        <label
          class="btn btn-primary my-5"
          @click="pageload(codes.pagination.next_key)"
        >
          {{ $t('cosmwasm.btn_next_page') }}
        </label>

        <label
          for="wasm_store_code"
          class="btn btn-primary my-5"
          @click="dialog.open('wasm_store_code', {})"
          >{{ $t('cosmwasm.btn_up_sc') }}</label
        >
      </div>
    </div>
  </div>
</template>

<route>
    {
      meta: {
        i18n: 'cosmwasm',
        order: 11
      }
    }
</route>
