import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import './config/firebase'
import './style.css'

createApp(App)
  .use(router)
  .mount('#app')