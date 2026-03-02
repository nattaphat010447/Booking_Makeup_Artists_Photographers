<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { auth, db } from '../../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { IonHeader, IonToolbar, IonButtons, IonButton } from '@ionic/vue';

const router = useRouter();
const isLoggedIn = ref(false);
const isAdmin = ref(false);
const hasUnreadChat = ref(false); 
const hasUnreadNoti = ref(false);

let unsubscribeChat: any = null;
let unsubscribeNoti: any = null;

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    isLoggedIn.value = !!user;
    
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        isAdmin.value = true;
      } else {
        isAdmin.value = false;
      }

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
      isAdmin.value = false;
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

const navigateTo = (path: string) => {
  (document.activeElement as HTMLElement)?.blur(); 
  router.push(path);
};

const handleSignOut = async () => {
  (document.activeElement as HTMLElement)?.blur();
  await signOut(auth);
  router.push('/');
};
</script>

<template>
  <ion-header class="ion-no-border">
    <ion-toolbar class="custom-toolbar">
      
      <div slot="start" class="nav-logo" @click="navigateTo('/search')">
        <img src="/images/Bookibooki.png" alt="Booki Booki Logo" class="logo-img" />
      </div>
      
      <ion-buttons slot="end">
        <template v-if="isLoggedIn">

          <div class="icon-wrapper" v-if="isAdmin">
            <ion-button shape="round" class="icon-btn" @click="navigateTo('/admin')">
              <img src="/images/administrator.png" class="icon-img" />
            </ion-button>
          </div>
          <div class="icon-wrapper">
            <ion-button shape="round" class="icon-btn" @click="navigateTo('/chats')">
              <img src="/images/bubble-chat.png" class="icon-img" />
            </ion-button>
            <span v-if="hasUnreadChat" class="badge"></span>
          </div>

          <div class="icon-wrapper">
            <ion-button shape="round" class="icon-btn" @click="navigateTo('/notifications')">
              <img src="/images/notification.png" class="icon-img" />
            </ion-button>
            <span v-if="hasUnreadNoti" class="badge"></span>
          </div>

          <ion-button shape="round" class="icon-btn" @click="navigateTo('/profile')">
            <img src="/images/user.png" class="icon-img" />
          </ion-button>

          <ion-button shape="round" class="icon-btn logout" @click="handleSignOut">
            <img src="/images/logout.png" class="icon-img" />
          </ion-button>
        </template>
          

        <template v-else>
          <div class="nav-actions">
            <ion-button fill="clear" @click="navigateTo('/register')" style="--color: #3b2b26; font-weight: 700;">Sign Up</ion-button>
            <ion-button fill="solid" @click="navigateTo('/login')" style="--background: #3b2b26; --color: white; --border-radius: 20px; font-weight: 700; margin-left: 8px;">Sign In</ion-button>
          </div>
        </template>

      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<style scoped>
.custom-toolbar {
  --background: #ffffff;
  --min-height: 72px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  --padding-start: 16px;
  --padding-end: 16px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.nav-logo {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.logo-img {
  height: 42px;
  width: auto;
  object-fit: contain;
}

.icon-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.badge { 
  position: absolute; 
  top: 4px; 
  right: 4px; 
  background-color: #ff3b30; 
  width: 10px; 
  height: 10px; 
  border-radius: 50%; 
  border: 2px solid #fff; 
  z-index: 10;
  pointer-events: none;
}

.icon-btn {
  --background: #faf8f5;
  --color: #3b2b26;
  --border-radius: 50%;
  width: 44px;
  height: 44px;
  margin: 0 4px;
  font-size: 16px;
}

.icon-btn.logout {
  --background: #ffebee;
}

.nav-actions {
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .custom-toolbar {
    --min-height: 64px;
  }
  .logo-img {
    height: 36px;
  }
  .icon-btn {
    width: 40px;
    height: 40px;
    margin: 0 2px;
  }
}
</style>