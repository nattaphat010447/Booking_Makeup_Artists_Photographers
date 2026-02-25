<script setup lang="ts">
import { ref } from 'vue';
import { auth } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const email = ref('');
const password = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  isLoading.value = true;
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    alert('เข้าสู่ระบบสำเร็จ!');
  } catch (error: any) {
    alert('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="auth-box">
    <h2>เข้าสู่ระบบ</h2>
    <form @submit.prevent="handleLogin">
      <div>
        <label>อีเมล:</label>
        <input v-model="email" type="email" required />
      </div>
      <div>
        <label>รหัสผ่าน:</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit" :disabled="isLoading">
        {{ isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.auth-box { border: 1px solid #ccc; padding: 20px; border-radius: 8px; max-width: 400px; margin: auto; }
div { margin-bottom: 10px; text-align: left; }
input { width: 100%; padding: 8px; margin-top: 5px; }
button { width: 100%; padding: 10px; background-color: #008CBA; color: white; border: none; cursor: pointer; }
</style>