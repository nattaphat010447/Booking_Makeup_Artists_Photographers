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
  <div class="auth-wrapper">

    <div class="login-card">
      <!-- Title -->
      <h2 class="title">Sign in</h2>

      <form @submit.prevent="handleLogin" class="form-group">

        <input
          v-model="email"
          type="email"
          placeholder="Email"
          required
        />

        <input
          v-model="password"
          type="password"
          placeholder="Password"
          required
        />

        <button type="submit" class="primary-btn" :disabled="isLoading">
          {{ isLoading ? 'Signing in...' : 'Sign in' }}
        </button>

      </form>
    </div>

    <!-- footer text -->
    <p class="signup-text">
      Don't have an account?
      <router-link to="/register">Sign up</router-link>
    </p>

  </div>
</template>

<style scoped>

/* ===== Wrapper (ไม่ควบคุมทั้งหน้าจอแล้ว) ===== */
.auth-wrapper {
  flex: 1; 
  width: 100%;
  padding: 80px 20px;
  background: #F8F4F0;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* ===== Card ===== */
.login-card {
  width: 360px;
  background: #FFFFFF;
  padding: 60px 35px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 6px 10px rgba(0,0,0,0.15);
  min-height: 420px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ===== Title ===== */
.title {
  font-size: 24px;
  font-weight: 600;
  color: #3b2b26;
  margin-bottom: 30px;
}

/* ===== Inputs ===== */
input {
  border: none;
  border-bottom: 1px solid #555;
  background: transparent;
  padding: 30px 4px;
  outline: none;
  font-size: 14px;
}

input::placeholder {
  color: #bfbfbf;
}

/* ===== Button ===== */
.primary-btn {
  margin-top: 80px;
  background: #C89F8A;
  border: none;
  padding: 10px;
  border-radius: 10px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: 0.2s;
  width: 140px;
  align-self: center;
}

.primary-btn:hover {
  background: #b8937f;
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* ===== Bottom Text ===== */
.signup-text {
  margin-top: 20px;
  font-size: 13px;
  color: #3b2b26;
}

.signup-text a {
  color: #C89F8A;
  text-decoration: none;
  font-weight: 500;
}

.signup-text a:hover {
  text-decoration: underline;
}

/* ===== Responsive ===== */
@media (max-width: 480px) {
  .login-card {
    width: 100%;
    max-width: 340px;
    padding: 50px 25px;
  }
}

</style>