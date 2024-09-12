<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, ref } from 'vue';

interface PageItem {
  color: string;
  page: number;
  type: 'number' | 'ellipsis';
}

const props = defineProps({
  total: { type: String },
  limit: { type: Number },
  callback: { type: Function, required: true },
});

const current = ref(1);
const showSize = 3;

const totalPages = computed(() =>
  Math.ceil(Number(props.total || 0) / (props.limit || 1))
);

const pages = computed((): PageItem[] => {
  if (!props.total || !props.limit || Number(props.total) <= props.limit) {
    return [];
  }

  const result: PageItem[] = [{ color: '', page: 1, type: 'number' }];

  if (current.value > showSize + 1) {
    result.push({ color: '', page: 0, type: 'ellipsis' });
  }

  for (
    let i = Math.max(2, current.value - showSize);
    i <= Math.min(totalPages.value - 1, current.value + showSize);
    i++
  ) {
    result.push({
      color: i === current.value ? 'btn-primary' : '',
      page: i,
      type: 'number',
    });
  }

  if (current.value < totalPages.value - showSize) {
    result.push({ color: '', page: 0, type: 'ellipsis' });
  }

  if (totalPages.value > 1) {
    result.push({ color: '', page: totalPages.value, type: 'number' });
  }

  return result;
});

function gotoPage(pageNum: number) {
  if (pageNum < 1 || pageNum > totalPages.value) return;
  current.value = pageNum;
  props.callback(pageNum);
}
</script>

<template>
  <div class="my-5 text-center">
    <div v-if="totalPages > 1" class="btn-group">
      <button
        class="btn bg-gray-100 text-gray-500 hover:text-white border-none dark:bg-gray-800 dark:text-white"
        @click="gotoPage(current - 1)"
        :disabled="current === 1"
      >
        <Icon icon="ooui:next-rtl" />
      </button>
      <button
        v-for="{ page, color, type } in pages"
        :key="page"
        class="btn bg-gray-100 text-gray-500 hover:text-white border-none dark:bg-gray-800 dark:text-white"
        :class="{ '!btn-primary': color === 'btn-primary' }"
        @click="type === 'number' ? gotoPage(page) : null"
      >
        {{ type === 'number' ? page : '...' }}
      </button>
      <button
        class="btn bg-gray-100 text-gray-500 hover:text-white border-none dark:bg-gray-800 dark:text-white"
        @click="gotoPage(current + 1)"
        :disabled="current === totalPages"
      >
        <Icon icon="ooui:next-ltr" />
      </button>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'PaginationBar',
};
</script>
