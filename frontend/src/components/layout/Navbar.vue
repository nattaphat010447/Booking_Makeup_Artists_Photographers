<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { auth, db } from '../../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const router = useRouter();
const isLoggedIn = ref(false);
const hasUnreadChat = ref(false); 
const hasUnreadNoti = ref(false);

let unsubscribeChat: any = null;
let unsubscribeNoti: any = null;

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    isLoggedIn.value = !!user;
    
    if (user) {
      // 1. เช็คแชท
      const qChat = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
      unsubscribeChat = onSnapshot(qChat, (snap) => {
        hasUnreadChat.value = snap.docs.some(doc => doc.data().unreadBy === user.uid);
      });

      // 2. เช็ค Noti
      const qNoti = query(
        collection(db, 'notifications'), 
        where('userId', '==', user.uid),
        where('isRead', '==', false)
      );
      unsubscribeNoti = onSnapshot(qNoti, (snap) => {
        hasUnreadNoti.value = !snap.empty;
      });

    } else {
      if (unsubscribeChat) unsubscribeChat();
      if (unsubscribeNoti) unsubscribeNoti();
      hasUnreadChat.value = false;
      hasUnreadNoti.value = false;
    }
  });
});

onUnmounted(() => {
  if (unsubscribeChat) unsubscribeChat();
  if (unsubscribeNoti) unsubscribeNoti();
});

const handleSignOut = async () => {
  await signOut(auth);
  router.push('/');
};
</script>

<template>
  <nav class="navbar">
    <div class="nav-logo">
          <router-link to="/">
            <img src="/images/Bookibooki.png" alt="Booki Booki Logo" class="logo-img" />
          </router-link>
        </div>
    
    <div v-if="isLoggedIn" class="nav-icons">
      <div class="icon-wrapper" @click="router.push('/chats')">
        <button class="icon-btn">💬</button>
        <span v-if="hasUnreadChat" class="badge"></span>
      </div>
      
      <div class="icon-wrapper" @click="router.push('/notifications')">
        <button class="icon-btn">🔔</button>
        <span v-if="hasUnreadNoti" class="badge"></span>
      </div>

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
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background-color: #ffffff; border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 100;}
.brand { font-weight: bold; font-size: 18px; cursor: pointer; color: #333; }
.nav-icons { display: flex; gap: 10px; align-items: center; }
.icon-wrapper { position: relative; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;}
.badge { position: absolute; top: 0; right: 0; background-color: #ff3b30; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; }
.icon-btn { background: #f0f2f5; border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;}
.icon-btn.logout { background: #ffebee; }
.nav-actions { display: flex; gap: 10px; }
.btn-text { background: none; border: none; color: #333; font-weight: bold; cursor: pointer; }
.btn-solid { background: #333; color: white; border: none; padding: 8px 15px; border-radius: 20px; font-weight: bold; cursor: pointer; }
</style>