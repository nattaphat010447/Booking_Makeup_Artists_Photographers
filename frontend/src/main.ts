import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './config/firebase'

// CSS
import './styles/base.css'
import './styles/auth.css'
import './styles/chat.css'
import './styles/home.css'
import './styles/notification.css'
import './styles/profile.css'
import './styles/provider.css'
import './styles/search.css'


createApp(App)
  .use(router)
  .mount('#app')