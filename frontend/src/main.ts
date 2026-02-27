import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './config/firebase'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'

createApp(App)
  .use(router)
  .mount('#app')