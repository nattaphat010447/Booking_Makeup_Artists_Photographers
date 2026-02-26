<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goSearch = (role: string) => {
  // ส่ง query string ไปให้หน้า Search ฟิลเตอร์อัตโนมัติ
  router.push(`/search?role=${role}`);
};
</script>

<template>
  <div class="home-page">
    <div class="hero-section">
      <h1>จองช่างภาพ<br>& ช่างแต่งหน้า</h1>
      <p>ค้นหามืออาชีพที่ใช่ สำหรับวันสำคัญของคุณ</p>
    </div>

    <div class="action-buttons">
      <button class="btn-primary" @click="goSearch('makeup')">💄 หาช่างแต่งหน้า</button>
      <button class="btn-primary" @click="goSearch('photographer')">📸 หาตากล้อง</button>
    </div>

    <div class="auth-buttons">
      <button class="btn-outline" @click="router.push('/register')">สมัครสมาชิก</button>
      <button class="btn-solid" @click="router.push('/login')">Sign In</button>
    </div>
  </div>
</template>

