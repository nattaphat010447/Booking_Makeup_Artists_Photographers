<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { IonPage, IonContent, IonInput, IonButton, IonSpinner } from '@ionic/vue';

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const router = useRouter();

const handleLogin = async () => {
  (document.activeElement as HTMLElement)?.blur();
  isLoading.value = true;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
    const user = userCredential.user;
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      
      if (userData.role === 'admin') {
        router.push('/admin');
      } else if (userData.role === 'provider') {
        router.push('/chats');
      } else {
        router.push('/search');
      }
    } else {
      router.push('/search');
    }
  } catch (error: any) {
    console.error(error);
    alert('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <ion-page>
    <ion-content>
      <div class="auth-wrapper">
        <div class="login-card">
          <h2 class="title">Sign in</h2>

          <form @submit.prevent="handleLogin" class="form-group">

            <ion-input
              v-model="email"
              type="email"
              placeholder="Email"
              class="custom-ion-input"
              required
            ></ion-input>

            <ion-input
              v-model="password"
              type="password"
              placeholder="Password"
              class="custom-ion-input"
              required
            ></ion-input>

            <ion-button type="submit" class="ionic-primary-btn" :disabled="isLoading" style="--background: #C89F8A;">
              <ion-spinner v-if="isLoading" name="crescent"></ion-spinner>
              <span v-else>Sign in</span>
            </ion-button>

          </form>
        </div>

        <p class="signup-text">
          Don't have an account?
          <router-link to="/register">Sign up</router-link>
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.auth-wrapper {
  flex: 1; 
  width: 100%;
  padding: 80px 20px;
  background: #F8F4F0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%; /* สำคัญมากเพื่อให้เต็มจอใน ion-content */
}

.login-card {
  width: 100%;
  max-width: 360px;
  background: #FFFFFF;
  padding: 60px 35px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 6px 10px rgba(0,0,0,0.15);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: #3b2b26;
  margin-bottom: 30px;
}

.custom-ion-input {
  --padding-start: 0px;
  --inner-padding-start: 0px;
  --inner-padding-end: 0px;
  text-align: left;

  border-bottom: 1px solid #555;
  font-size: 15px;
  margin-bottom: 10px;
}

.ionic-primary-btn {
  margin-top: 40px;
  height: 48px;
  --border-radius: 10px;
  font-weight: 500;
  width: 140px;
  align-self: center;
}

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

@media (max-width: 480px) {
  .login-card {
    padding: 50px 25px;
  }
}
</style>