// import 'ping-widget';
import App from '@/App.vue';
import i18n from '@/plugins/i18n';
import '@/style.css';
import LazyLoad from 'lazy-load-vue3';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { VueDd } from 'vue-dd';

import router from './router';

// Create vue app
const app = createApp(App);
// register component
app.component('VueDd', VueDd);
// Use plugins
app.use(i18n);
app.use(createPinia());
app.use(router);
app.use(LazyLoad, { component: true });
// Mount vue app
app.mount('#app');
