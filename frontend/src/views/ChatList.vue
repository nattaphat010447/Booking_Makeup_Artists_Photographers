<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { auth, db } from '../config/firebase';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { IonPage, IonContent, IonSpinner, IonList, IonItem, IonAvatar, IonLabel } from '@ionic/vue';

const router = useRouter();
const chatRooms = ref<any[]>([]);
const isLoading = ref(true);
let unsubscribe: any = null;

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      fetchChatRooms(user.uid);
    } else {
      router.push('/login');
    }
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const fetchChatRooms = (myUid: string) => {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', myUid)
  );

  unsubscribe = onSnapshot(q, async (snapshot) => {
    let roomsData: any[] = [];
    
    for (const document of snapshot.docs) {
      const data = document.data();
      const otherUid = data.participants.find((uid: string) => uid !== myUid);
      
      if (otherUid) {
        const userSnap = await getDoc(doc(db, 'users', otherUid));
        const userData = userSnap.exists() ? userSnap.data() : { full_name: 'Unknown User', profile_image: '' };

        roomsData.push({
          id: otherUid,
          name: userData.full_name,
          avatar: userData.profile_image || 'https://via.placeholder.com/50',
          lastMessage: data.lastMessage || 'ส่งรูปภาพ/ใบเสนอราคา',
          updatedAt: data.updatedAt?.toMillis() || 0,
          unreadBy: data.unreadBy // เพื่อเช็คตัวหนาถ้ายังไม่อ่าน
        });
      }
    }
    
    roomsData.sort((a, b) => b.updatedAt - a.updatedAt);
    chatRooms.value = roomsData;
    isLoading.value = false;
  });
};
</script>

<template>
  <ion-page>
    <Navbar />
    
    <ion-content>
      <div class="page-container">
        
        <div class="chat-header">
          <h2>💬 ข้อความของคุณ</h2>
        </div>

        <div v-if="isLoading" class="loading">
          <ion-spinner name="crescent"></ion-spinner>
          <p>กำลังโหลดข้อความ...</p>
        </div>
        <div v-else-if="chatRooms.length === 0" class="empty">ยังไม่มีประวัติการสนทนา</div>

        <ion-list v-else lines="full" class="chat-list">
          <ion-item 
            v-for="chat in chatRooms" 
            :key="chat.id" 
            button 
            :detail="false"
            @click="router.push(`/chat/${chat.id}`)"
            class="chat-item"
          >
            <ion-avatar slot="start" class="chat-avatar">
              <img :src="chat.avatar" />
            </ion-avatar>

            <ion-label>
              <div class="row-top">
                <span class="name" :class="{ 'unread-text': chat.unreadBy === auth.currentUser?.uid }">
                  {{ chat.name }}
                </span>
                <span class="time">ล่าสุด</span>
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