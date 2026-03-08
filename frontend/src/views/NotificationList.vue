<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { db, auth } from '../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { IonPage, IonContent, IonSpinner } from '@ionic/vue';

const router = useRouter();
const notifications = ref<any[]>([]);
const isLoading = ref(true);
let unsubscribe: any = null;

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      fetchNotifications(user.uid);
    } else {
      router.push('/login');
    }
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const fetchNotifications = (uid: string) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid)
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    const notis: any[] = [];
    snapshot.forEach(doc => {
      notis.push({ id: doc.id, ...doc.data() });
    });
    notifications.value = notis.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    isLoading.value = false;
  });
};

const handleNotificationClick = async (noti: any) => {
  if (!noti.isRead) {
    await updateDoc(doc(db, 'notifications', noti.id), { isRead: true });
  }
  if (noti.link) {
    router.push(noti.link);
  }
};

const deleteNotification = async (id: string, event: Event) => {
  event.stopPropagation();
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (error) {
    console.error("Error deleting notification: ", error);
  }
};
</script>

<template>
  <ion-page>
    <Navbar />
    
    <ion-content class="custom-content">
      <div class="page-container">
        <div class="header">
          <h2>Notification</h2>
        </div>

        <div v-if="isLoading" class="loading">
          <ion-spinner name="crescent" color="medium"></ion-spinner>
          <p>Loading...</p>
        </div>
        <div v-else-if="notifications.length === 0" class="empty">No notifications available</div>

        <div v-else class="noti-list">
          <div 
            v-for="noti in notifications" 
            :key="noti.id" 
            class="noti-card"
            :class="{ 'unread': !noti.isRead }"
            @click="handleNotificationClick(noti)"
          >
            <div class="noti-content">
              <div class="noti-title">{{ noti.title }}</div>
              <div class="noti-message">{{ noti.message }}</div>
              <div class="noti-time">
                {{ noti.createdAt ? new Date(noti.createdAt.toMillis()).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'เพิ่งส่ง' }}
              </div>
            </div>
            <button class="delete-btn" @click="(e) => deleteNotification(noti.id, e)">✕</button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.page-container { display: flex; flex-direction: column; min-height: 100%; background: #FAFAFA; }
.custom-content { --background: #FAFAFA; }

.header { padding: 24px 20px; background: white; border-bottom: 1px solid rgba(0,0,0,0.05); }
.header h2 { margin: 0; font-size: 22px; color: #3b2b26; font-weight: 700; }
.loading, .empty { text-align: center; padding: 60px 20px; color: #888; font-size: 16px; }

.noti-list { display: flex; flex-direction: column; }
.noti-card { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; background: white; border-bottom: 1px solid rgba(0,0,0,0.04); cursor: pointer; transition: background 0.2s; }
.noti-card:hover { background: #faf8f5; }
.noti-card.unread { background: #fdfaf7; border-left: 4px solid #C89F8A; padding-left: 20px; }

.noti-content { flex: 1; text-align: left; padding-right: 16px; }
.noti-title { font-weight: 600; font-size: 16px; color: #3b2b26; margin-bottom: 6px; }
.noti-message { font-size: 14px; color: #6b5a50; margin-bottom: 10px; line-height: 1.5; }
.noti-time { font-size: 12px; color: #a39c97; font-weight: 500; }

.delete-btn { background: none; border: none; color: #d1c8c3; font-size: 16px; cursor: pointer; padding: 8px; border-radius: 50%; transition: 0.2s; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; }
.delete-btn:hover { background: #f4efe9; color: #e53935; }
</style>
