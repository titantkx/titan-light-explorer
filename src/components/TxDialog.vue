<script lang="ts" setup>
import { useBlockchain, useTxDialog } from '@/stores';
import TitanCustomDialog from './dialog/TitanCustomDialog.vue';
const store = useTxDialog();
const chainStore = useBlockchain();
</script>
<template>
  <!-- <ping-tx-dialog
    :type="store.type"
    :sender="store.sender"
    :endpoint="store.endpoint"
    :params='store.params'
    :hd-path="store.hdPaths"
    :registry-name="chainStore.current?.prettyName || chainStore.chainName"
    @view="store.view"
    @confirmed="store.confirmed"
  ></ping-tx-dialog> -->
  <TitanCustomDialog
    :type="store.type"
    :sender="store.sender"
    :endpoint="store.endpoint"
    :params="store.params"
    :hd-path="store.hdPaths"
    :registry-name="chainStore.current?.prettyName || chainStore.chainName"
    @view="store.view"
    @confirmed="store.confirmed"
  />
</template>
