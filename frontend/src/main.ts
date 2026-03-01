import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './config/firebase'
import { IonicVue } from '@ionic/vue';

// Core CSS ของ Ionic
import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

// CSS
import './styles/base.css'
import './styles/auth.css'
import './styles/chat.css'
import './styles/home.css'
import './styles/notification.css'
import './styles/profile.css'
import './styles/provider.css'
import './styles/search.css'

const app = createApp(App)
  .use(IonicVue)
  .use(router);
  
router.isReady().then(() => {
  app.mount('#app');
});