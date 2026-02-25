<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const router = useRouter();
const isLoggedIn = ref(false);

// เช็คสถานะตอนโหลด Component
onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    isLoggedIn.value = !!user; // ถ้ามี user จะเป็น true
  });
});

const handleSignOut = async () => {
  await signOut(auth);
  router.push('/');
};
</script>

<template>
  <nav class="navbar">
    <div class="brand" @click="router.push('/')">
      📸 BookBeauty
    </div>
    
    <div v-if="isLoggedIn" class="nav-icons">
      <button class="icon-btn" @click="router.push('/chats')">💬</button>
      <button class="icon-btn">🔔</button>
      <button class="icon-btn" @click="router.push('/profile')">👤</button>
      <button class="icon-btn logout" @click="handleSignOut">🚪</button>
    </div>

    <div v-else class="nav-actions">
      <button class="btn-text" @click="router.push('/register')">Sign Up</button>
      <button class="btn-solid" @click="router.push('/login')">Sign In</button>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
}
.brand {
  font-weight: bold;
  font-size: 18px;
  cursor: pointer;
  color: #333;
}
.nav-icons { display: flex; gap: 10px; }
.icon-btn { background: #f0f2f5; border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;}
.icon-btn.logout { background: #ffebee; }
.nav-actions { display: flex; gap: 10px; }
.btn-text { background: none; border: none; color: #333; font-weight: bold; cursor: pointer; }
.btn-solid { background: #333; color: white; border: none; padding: 8px 15px; border-radius: 20px; font-weight: bold; cursor: pointer; }
</style>