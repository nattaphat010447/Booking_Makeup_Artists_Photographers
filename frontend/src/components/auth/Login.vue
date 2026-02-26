<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const router = useRouter(); // <--- นำเข้า router

const handleLogin = async () => {
  isLoading.value = true;
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    router.push('/search'); // <--- เด้งไปหน้าค้นหาช่าง (แบบล็อคอินแล้ว)
  } catch (error: any) {
    alert('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="auth-container">
    <button class="back-btn" @click="router.push('/')">← กลับหน้าแรก</button>
    <h2>เข้าสู่ระบบ</h2>
    <form @submit.prevent="handleLogin">
      <div class="input-group">
        <label>อีเมล:</label>
        <input v-model="email" type="email" required />
      </div>
      <div class="input-group">
        <label>รหัสผ่าน:</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit" class="submit-btn" :disabled="isLoading">
        {{ isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
      </button>
    </form>
  </div>
</template>

