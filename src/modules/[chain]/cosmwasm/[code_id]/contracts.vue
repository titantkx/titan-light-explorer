<script lang="ts" setup>
import DynamicComponent from '@/components/dynamic/DynamicComponent.vue';
import { useTxDialog } from '@/stores';
import { PageRequest } from '@/types';
import { ref } from 'vue';
import { useWasmStore } from '../WasmStore';
import type { ContractInfo, PaginabledContracts } from '../types';

const props = defineProps(['code_id', 'chain']);

const pageRequest = ref(new PageRequest());
const response = ref({} as PaginabledContracts);

const info = ref({} as ContractInfo);
const dialog = useTxDialog();
const infoDialog = ref(false);
const wasmStore = useWasmStore();
function loadContract(key?: string) {
  const pr = new PageRequest();
  pr.count_total = false;
  pr.key = key;
  if (String(props.code_id).search(/^[\d]+$/) > -1) {
    // query with code id
    wasmStore.wasmClient.getWasmCodeContracts(props.code_id, pr).then((x) => {
      response.value = x;
    });
  } else {
    // query by creator
    wasmStore.wasmClient
      .getWasmContractsByCreator(props.code_id, pr)
      .then((x) => {
        response.value = {
          contracts: x.contract_addresses,
          pagination: x.pagination,
        };
      });
  }
}
loadContract();

function showInfo(address: string) {
  wasmStore.wasmClient.getWasmContracts(address).then((x) => {
    info.value = x.contract_info;
  });
}
</script>
<template>
  <div>
    <div class="bg-base-100 px-4 pt-3 pb-4 rounded mb-4 shadow">
      <h2 class="card-title truncate w-full">
        {{ $t('cosmwasm.contract_list_code') }}: {{ props.code_id }}
      </h2>
      <div class="overflow-x-auto">
        <table class="table table-compact w-full mt-4">
          <thead>
            <tr>
              <th style="position: relative; z-index: 2">
                {{ $t('cosmwasm.contract_list') }}
              </th>
              <th>{{ $t('account.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(v, index) in response.contracts"
              :key="index"
              class="hover"
            >
              <td>{{ v }}</td>
              <td>
                <label
                  @click="showInfo(v)"
                  for="modal-contract-detail"
                  class="btn btn-primary btn-xs text-xs mr-2"
                  >{{ $t('cosmwasm.btn_contract') }}</label
                >
                <RouterLink
                  :to="`transactions?contract=${v}`"
                  class="btn btn-primary btn-xs text-xs"
                >
                  {{ $t('cosmwasm.btn_details') }}
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="flex justify-between">
          <label
            class="btn btn-primary my-5"
            @click="loadContract(response.pagination.next_key)"
          >
            {{ $t('cosmwasm.btn_next_page') }}
          </label>
          <label
            for="wasm_instantiate_contract"
            class="btn btn-primary my-5"
            @click="
              dialog.open('wasm_instantiate_contract', {
                codeId: props.code_id,
              })
            "
            >{{ $t('cosmwasm.instantiate_contract') }}</label
          >
        </div>
      </div>
    </div>

    <input type="checkbox" id="modal-contract-detail" class="modal-toggle" />
    <label for="modal-contract-detail" class="modal cursor-pointer">
      <label class="modal-box !w-11/12 !max-w-5xl relative p-2" for="">
        <div>
          <div class="flex items-center justify-between px-3 pt-2">
            <div class="text-lg">{{ $t('cosmwasm.contract_detail') }}</div>
            <label
              @click="infoDialog = false"
              for="modal-contract-detail"
              class="btn btn-sm btn-circle"
              >✕</label
            >
          </div>
          <div>
            <DynamicComponent :value="info" />
          </div>
        </div>
      </label>
    </label>
  </div>
</template>
