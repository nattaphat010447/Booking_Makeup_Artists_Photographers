<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { auth, db } from '../config/firebase';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import { IonPage, IonContent, IonList, IonItem, IonAvatar, IonLabel, IonBadge, IonSpinner, onIonViewWillEnter, onIonViewDidLeave } from '@ionic/vue';

const router = useRouter();
const chatRooms = ref<any[]>([]);
const isLoading = ref(true);

let authUnsubscribe: any = null;
let chatUnsubscribe: any = null;

const goToChat = (id: string) => {
  (document.activeElement as HTMLElement)?.blur();
  router.push(`/chat/${id}`);
};

onIonViewWillEnter(() => {
  isLoading.value = true;
  chatRooms.value = []; // เคลียร์แชทเก่าทิ้งทันทีป้องกันการแสดงผลค้าง

  authUnsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      if (chatUnsubscribe) chatUnsubscribe();

      const q = query(
        collection(db, 'chats'), 
        where('participants', 'array-contains', user.uid)
      );

      chatUnsubscribe = onSnapshot(q, async (snapshot) => {
        const roomsData: any[] = [];
        
        for (const document of snapshot.docs) {
          const data = document.data();
          const otherUserId = data.participants.find((id: string) => id !== user.uid);
          
          let otherUserData = { full_name: 'Unknown', profile_image: '' };
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              otherUserData = userDoc.data() as any;
            }
          }

          roomsData.push({
            id: otherUserId,
            ...data,
            name: otherUserData.full_name,
            avatar: otherUserData.profile_image,
            hasUnread: data.unreadBy === user.uid 
          });
        }

        chatRooms.value = roomsData.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return timeB - timeA;
        });
        
        isLoading.value = false;
      });
    } else {
      chatRooms.value = [];
      isLoading.value = false;
      router.push('/login');
    }
  });
});

onIonViewDidLeave(() => {
  if (authUnsubscribe) authUnsubscribe();
  if (chatUnsubscribe) chatUnsubscribe();
});
</script>

<template>
  <ion-page>
    <Navbar />
    
    <ion-content>
      <div class="page-container">
        
        <div class="chat-header">
          <h2>Chat</h2>
        </div>

        <div v-if="isLoading" class="loading">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading...</p>
        </div>
        <div v-else-if="chatRooms.length === 0" class="empty">There is no conversation history yet.</div>

        <ion-list v-else lines="full" class="chat-list">
          <ion-item 
            v-for="chat in chatRooms" 
            :key="chat.id" 
            button 
            :detail="false"
            @click="goToChat(chat.id)" 
            class="chat-item"
          >
            <ion-avatar slot="start" class="chat-avatar">
              <img :src="chat.avatar && chat.avatar.includes('http') ? chat.avatar : 'https://ui-avatars.com/api/?name=User&background=EAEAEA&color=333'" />
            </ion-avatar>

            <ion-label>
              <div class="row-top">
                <span class="name" :class="{ 'unread-text': chat.unreadBy === auth.currentUser?.uid }">
                  {{ chat.name }}
                </span>
                <span class="time">latest</span>
              </div>
              <p class="last-message" :class="{ 'unread-text': chat.unreadBy === auth.currentUser?.uid }">
                {{ chat.lastMessage }}
              </p>
            </ion-label>
            
            <div v-if="chat.unreadBy === auth.currentUser?.uid" class="unread-dot"></div>
          </ion-item>
        </ion-list>

      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #FAFAFA;
}
.chat-header {
  padding: 24px 20px;
  background: white;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}
.chat-header h2 { margin: 0; font-size: 22px; color: #3b2b26; font-weight: 700; }

.loading, .empty { text-align: center; padding: 60px 20px; color: #888; }

.chat-list {
  background: white;
  padding: 0;
  margin: 0;
}
.chat-item {
  --padding-start: 20px;
  --inner-padding-end: 20px;
  --padding-top: 8px;
  --padding-bottom: 8px;
}
.chat-avatar {
  width: 56px;
  height: 56px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.name { font-weight: 600; font-size: 16px; color: #3b2b26; }
.time { font-size: 12px; color: #a39c97; font-weight: 500;}
.last-message { margin: 0; font-size: 14px; color: #6b5a50; }

.unread-text {
  font-weight: 700;
  color: #3b2b26;
}
.unread-dot {
  width: 10px;
  height: 10px;
  background-color: #ff3b30;
  border-radius: 50%;
  margin-left: 10px;
}
</style>