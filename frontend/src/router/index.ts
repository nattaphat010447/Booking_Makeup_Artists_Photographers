import { createRouter, createWebHistory } from 'vue-router';

import HomeView from '../views/HomeView.vue';
import Login from '../components/auth/Login.vue';
import Register from '../components/auth/Register.vue';
const SearchProvider = () => import('../views/SearchProvider.vue'); 
const ProviderProfile = () => import('../views/ProviderProfile.vue');
const ChatList = () => import('../views/ChatList.vue');
const ChatRoom = () => import('../views/ChatRoom.vue');
const MyProfile = () => import('../views/MyProfile.vue');
const NotificationList = () => import('../views/NotificationList.vue');

const routes = [
  { path: '/', component: HomeView },
  { path: '/register', component: Register },
  { path: '/login', component: Login },
  { path: '/search', component: SearchProvider },
  { path: '/provider/:id', component: ProviderProfile },
  { path: '/chats', component: ChatList },
  { path: '/chat/:id', component: ChatRoom }, 
  { path: '/profile', component: MyProfile },
  { path: '/notifications', component: NotificationList },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;