<script setup lang="ts">
import { ref } from 'vue';
import Login from './components/auth/Login.vue';
import Register from './components/auth/Register.vue';

const currentView = ref('login');
</script>

<template>
  <div class="container">
    <h1>ระบบจองช่างแต่งหน้า & ช่างภาพ</h1>
    
    <div class="toggle-buttons">
      <button @click="currentView = 'login'" :class="{ active: currentView === 'login' }">เข้าสู่ระบบ</button>
      <button @click="currentView = 'register'" :class="{ active: currentView === 'register' }">สมัครสมาชิก</button>
    </div>

    <Login v-if="currentView === 'login'" />
    <Register v-if="currentView === 'register'" />
  </div>
</template>

<style scoped>
.container { text-align: center; margin-top: 50px; }
.toggle-buttons { margin-bottom: 20px; }
.toggle-buttons button { margin: 0 10px; padding: 10px 20px; border: 1px solid #ccc; background: #fff; cursor: pointer; }
.toggle-buttons button.active { background: #333; color: white; border-color: #333; }
</style>