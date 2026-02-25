import { createRouter, createWebHistory } from 'vue-router';

import HomeView from '../views/HomeView.vue';
import Login from '../components/auth/Login.vue';
import Register from '../components/auth/Register.vue';
const SearchProvider = () => import('../views/SearchProvider.vue'); 
const ProviderProfile = () => import('../views/ProviderProfile.vue');
const ChatList = () => import('../views/ChatList.vue');
const ChatRoom = () => import('../views/ChatRoom.vue');
const MyProfile = () => import('../views/MyProfile.vue');

const routes = [
  { path: '/', component: HomeView }, // 1. หน้าแรก
  { path: '/register', component: Register }, // 2. หน้าสมัคร
  { path: '/login', component: Login }, // 3. หน้าเข้าสู่ระบบ
  { path: '/search', component: SearchProvider }, // 4. & 6. หน้าค้นหา (เดี๋ยวเราไปเช็ค auth status ข้างใน)
  { path: '/provider/:id', component: ProviderProfile }, // 5. & 7. หน้าโปรไฟล์ช่าง
  { path: '/chats', component: ChatList }, // 8. หน้าแชทรวม
  { path: '/chat/:id', component: ChatRoom }, // 10. หน้าแชทกับ Provider
  { path: '/profile', component: MyProfile }, // 9. หน้าจัดการโปรไฟล์ตัวเอง
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;