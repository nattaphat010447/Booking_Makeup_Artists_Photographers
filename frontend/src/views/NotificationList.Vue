<style src="src/styles/notification.css"></style>
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

