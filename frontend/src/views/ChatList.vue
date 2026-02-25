<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';

const router = useRouter();

// Mockup Data: รายการคนที่เคยคุยด้วย
const chatRooms = ref([
  { 
    id: 'user_123', 
    name: 'พี่นัท ช่างภาพอิสระ (Mockup)', 
    avatar: 'https://via.placeholder.com/50', 
    lastMessage: 'ส่งใบเสนอราคาให้แล้วนะครับ', 
    time: '10:30' 
  },
  { 
    id: 'user_456', 
    name: 'น้องเมย์ แต่งหน้าทำผม', 
    avatar: 'https://via.placeholder.com/50', 
    lastMessage: 'วันเสาร์นี้คิวว่างค่ะ สนใจจองเลยไหมคะ?', 
    time: 'เมื่อวาน' 
  }
]);
</script>

<template>
  <div class="page-container">
    <Navbar />
    
    <div class="chat-header">
      <h2>💬 ข้อความของคุณ</h2>
    </div>

    <div class="chat-list">
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
            <span class="time">{{ chat.time }}</span>
          </div>
          <p class="last-message">{{ chat.lastMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container { display: flex; flex-direction: column; min-height: 100vh; background: #f9f9f9; }
.chat-header { padding: 20px; background: white; border-bottom: 1px solid #eee; text-align: left;}
.chat-header h2 { margin: 0; font-size: 20px; color: #333; }

.chat-list { display: flex; flex-direction: column; }
.chat-item { display: flex; align-items: center; padding: 15px 20px; background: white; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s; }
.chat-item:hover { background: #f0f2f5; }
.avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin-right: 15px; }
.chat-info { flex: 1; text-align: left; overflow: hidden; }
.row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.name { font-weight: bold; font-size: 16px; color: #333; }
.time { font-size: 12px; color: #888; }
.last-message { margin: 0; font-size: 14px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>