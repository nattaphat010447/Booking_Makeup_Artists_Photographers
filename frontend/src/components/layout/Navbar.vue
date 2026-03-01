<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { auth, db } from '../../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { IonHeader, IonToolbar, IonButton, IonButtons } from '@ionic/vue';

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
  <ion-header class="ion-no-border">
    <ion-toolbar class="custom-toolbar">
      
      <div slot="start" class="nav-logo" @click="router.push('/search')">
        <img src="/images/Bookibooki.png" alt="Booki Booki Logo" class="logo-img" />
      </div>
      
      <ion-buttons slot="end" class="nav-actions">
        
        <template v-if="isLoggedIn">
          <div class="icon-wrapper" @click="router.push('/chats')">
            <ion-button class="icon-btn">💬</ion-button>
            <span v-if="hasUnreadChat" class="badge"></span>
          </div>
          
          <div class="icon-wrapper" @click="router.push('/notifications')">
            <ion-button class="icon-btn">🔔</ion-button>
            <span v-if="hasUnreadNoti" class="badge"></span>
          </div>

          <ion-button class="icon-btn" @click="router.push('/profile')">👤</ion-button>
          <ion-button class="icon-btn logout" @click="handleSignOut">🚪</ion-button>
        </template>

        <template v-else>
          <ion-button fill="clear" class="btn-text" @click="router.push('/register')">Sign Up</ion-button>
          <ion-button fill="solid" class="btn-solid" @click="router.push('/login')">Sign In</ion-button>
        </template>

      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<style scoped>
.custom-toolbar {
  --background: #ffffff;
  --border-color: rgba(0,0,0,0.05);
  --border-width: 0 0 1px 0;
  --border-style: solid;
  --padding-top: 6px;
  --padding-bottom: 6px;
}

.nav-logo {
  cursor: pointer;
  margin-left: 12px;
  display: flex;
  align-items: center;
}

.logo-img {
  height: 38px;
  object-fit: contain;
}

.nav-actions {
  margin-right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.badge {
  position: absolute;
  top: 8px;
  right: 6px;
  background-color: #ff3b30;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  z-index: 10;
  pointer-events: none;
}

.icon-btn {
  --background: #f0f2f5;
  --background-hover: #e4e6e9;
  --border-radius: 50%;
  --padding-start: 0;
  --padding-end: 0;
  width: 42px;
  height: 42px;
  font-size: 18px;
  margin: 0 2px;
}

.icon-btn.logout {
  --background: #ffebee;
  --background-hover: #ffcdd2;
}

/* ปุ่มก่อนล็อกอิน */
.btn-text {
  --color: #3b2b26;
  font-weight: 600;
  font-family: inherit;
  text-transform: none;
  margin-right: 4px;
}

.btn-solid {
  --background: #3b2b26;
  --background-hover: #2a1e1b;
  --border-radius: 20px;
  --color: white;
  font-weight: 600;
  font-family: inherit;
  text-transform: none;
  height: 36px;
}
</style>