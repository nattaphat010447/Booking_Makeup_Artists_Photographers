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

<style scoped>
.home-page {
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  text-align: center;
}
.hero-section {
  margin-top: 40px;
  margin-bottom: 50px;
}
.hero-section h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 10px;
}
.hero-section p {
  color: #666;
}
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: auto;
}
.btn-primary {
  padding: 15px;
  font-size: 18px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}
.auth-buttons {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 20px;
}
.btn-outline, .btn-solid {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
.btn-outline {
  border: 1px solid #333;
  background: transparent;
  color: #333;
}
.btn-solid {
  border: none;
  background: #333;
  color: white;
}
</style>