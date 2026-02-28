
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { auth, db } from '../config/firebase';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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
  // ดึงเฉพาะห้องแชทที่ตัวเองอยู่ในวงสนทนา (participants)
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', myUid)
  );

  unsubscribe = onSnapshot(q, async (snapshot) => {
    let roomsData: any[] = [];
    
    for (const document of snapshot.docs) {
      const data = document.data();
      // หา UID ของอีกฝั่ง
      const otherUid = data.participants.find((uid: string) => uid !== myUid);
      
      if (otherUid) {
        // ดึงข้อมูล Profile ของอีกฝั่งมา
        const userSnap = await getDoc(doc(db, 'users', otherUid));
        const userData = userSnap.exists() ? userSnap.data() : { full_name: 'Unknown User', profile_image: '' };

        roomsData.push({
          id: otherUid, // ใช้ otherUid ไปต่อท้าย URL
          name: userData.full_name,
          avatar: userData.profile_image || 'https://via.placeholder.com/50',
          lastMessage: data.lastMessage || 'ส่งรูปภาพ/ใบเสนอราคา',
          updatedAt: data.updatedAt?.toMillis() || 0
        });
      }
    }
    
    // จัดเรียงให้แชทล่าสุดอยู่บนสุด
    roomsData.sort((a, b) => b.updatedAt - a.updatedAt);
    chatRooms.value = roomsData;
    isLoading.value = false;
  });
};
</script>

<template>
  <div class="page-container">
    <Navbar />
    
    <div class="chat-header">
      <h2>💬 ข้อความของคุณ</h2>
    </div>

    <div v-if="isLoading" class="loading">กำลังโหลดข้อความ...</div>
    <div v-else-if="chatRooms.length === 0" class="empty">ยังไม่มีประวัติการสนทนา</div>

    <div v-else class="chat-list">
      <div 
        v-for="chat in chatRooms" 
        :key="chat.id" 
        class="chat-item" 
        @click="router.push(`/chat/${chat.id}`)"
      >
        <img :src="chat.avatar" class="avatar" />
        <div class="chat-info">
          <div class="row-top">
            <span class="name">{{ chat.name }}</span>
            <span class="time">ล่าสุด</span>
          </div>
          <p class="last-message">{{ chat.lastMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>



