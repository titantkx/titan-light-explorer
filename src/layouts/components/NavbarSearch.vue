<script lang="ts" setup>
import { useBlockchain } from '@/stores';
import { Icon } from '@iconify/vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const vueRouters = useRouter();
const blockStore = useBlockchain();

let searchModalShow = ref(false);
let searchQuery = ref('');
let errorMessage = ref('');

onMounted(() => {});

function closeSearchModal() {
  searchModalShow.value = false;
}

function openSearchModal() {
  searchModalShow.value = true;
}

function preventClick(event: any) {
  event.preventDefault();
  event.stopPropagation();
}

function confirm() {
  errorMessage.value = '';
  const key = searchQuery.value;
  if (!key) {
    errorMessage.value = 'Please enter a value!';
    return;
  }
  const height = /^\d+$/;
  const txhash = /^([A-Z\d]{64}|0x[a-fA-F0-9]{64})$/;
  const addr = /^[a-z\d]+1[a-z\d]{38,58}$/;

  const current = blockStore?.current?.chainName || '';
  const routeParams = vueRouters?.currentRoute?.value;

  if (!Object.values(routeParams?.params).includes(key)) {
    if (height.test(key)) {
      vueRouters.push({ path: `/${current}/block/${key}` });
      closeSearchModal();
    } else if (txhash.test(key)) {
      vueRouters.push({ path: `/${current}/tx/${key}` });
      closeSearchModal();
    } else if (addr.test(key)) {
      vueRouters.push({ path: `/${current}/account/${key}` });
      closeSearchModal();
    } else {
      errorMessage.value = 'The input not recognized';
    }
  }
}
</script>
<template>
  <div>
    <button
      class="btn btn-ghost btn-circle btn-sm mx-1"
      @click="openSearchModal"
    >
      <Icon
        icon="mdi:magnify"
        class="text-2xl text-gray-500 dark:text-gray-400"
      />
    </button>

    <!-- modal -->
    <div
      v-if="searchModalShow"
      class="cursor-pointer modal !pointer-events-auto !opacity-100 !visible"
      @click="closeSearchModal"
    >
      <div
        class="relative modal-box cursor-default"
        @click="(event) => preventClick(event)"
      >
        <!-- header -->
        <div class="flex items-center justify-between">
          <div
            class="text-lg font-bold flex flex-col md:!flex-row justify-between items-baseline"
          >
            <span class="mr-2">Search</span>
            <span class="capitalize text-sm md:!text-base"
              >Height/Transaction/Account Address</span
            >
          </div>
          <label
            htmlFor="modal-pool-modal"
            class="cursor-pointer"
            @click="closeSearchModal"
          >
            <Icon
              icon="zondicons:close-outline"
              class="text-2xl text-gray-500 dark:text-gray-400"
            />
          </label>
        </div>
        <!-- body -->
        <div class="mt-4">
          <div class="">
            <input
              class="input flex-1 w-full !input-bordered"
              v-model="searchQuery"
              placeholder="Height/Transaction/Account Address"
            />
            <div
              class="mt-2 text-right text-sm text-error"
              v-show="errorMessage"
            >
              {{ errorMessage }}
            </div>
          </div>
        </div>
        <!-- foot -->
        <div class="mt-6">
          <button class="w-full btn btn-primary" @click="confirm">
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
