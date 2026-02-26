<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { db, auth } from '../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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
  // ดึงแจ้งเตือนของตัวเอง
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
  <div class="page-container">
    <Navbar />
    
    <div class="header">
      <h2>🔔 การแจ้งเตือน</h2>
    </div>

    <div v-if="isLoading" class="loading">กำลังโหลด...</div>
    <div v-else-if="notifications.length === 0" class="empty">ไม่มีการแจ้งเตือน</div>

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
</template>

<style scoped>
.page-container { display: flex; flex-direction: column; min-height: 100vh; background: #f9f9f9; }
.header { padding: 20px; background: white; border-bottom: 1px solid #eee; text-align: left;}
.header h2 { margin: 0; font-size: 20px; color: #333; }
.loading, .empty { text-align: center; padding: 50px; color: #888; font-size: 16px; }

.noti-list { display: flex; flex-direction: column; }
.noti-card { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start;
  padding: 15px 20px; 
  background: white; 
  border-bottom: 1px solid #eee; 
  cursor: pointer; 
  transition: 0.2s; 
}
/* สีพื้นหลังสำหรับอันที่ยังไม่อ่าน */
.noti-card.unread { background: #E3F2FD; }

.noti-content { flex: 1; text-align: left; padding-right: 10px; }
.noti-title { font-weight: bold; font-size: 15px; color: #333; margin-bottom: 4px; }
.noti-message { font-size: 14px; color: #555; margin-bottom: 6px; line-height: 1.4; }
.noti-time { font-size: 11px; color: #888; }

.delete-btn { 
  background: none; 
  border: none; 
  color: #999; 
  font-size: 16px; 
  cursor: pointer; 
  padding: 5px; 
  border-radius: 50%;
}
.delete-btn:hover { background: #ffebee; color: #d32f2f; }
</style>