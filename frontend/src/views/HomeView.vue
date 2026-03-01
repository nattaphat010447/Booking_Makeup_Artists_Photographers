<style src="../styles/home.css"></style>
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/vue';

const router = useRouter();

const goSearch = (role: string) => {
  router.push(`/search?role=${role}`);
};
</script>

<template>
  <ion-page>
    <ion-content>
      <div class="page">
        
        <section class="hero">
          <div class="hero-inner">
            <img src="/images/Bookibooki.png" alt="BookiBooki Logo" class="logo" />

            <div class="action-buttons">
              <ion-button expand="block" class="ionic-primary-btn" @click="goSearch('makeup')" style="--background: #C89F8A;">
                <img src="/images/brush.png" class="btn-icon" style="margin-right: 8px;" />
                Find Makeup Artists
              </ion-button>

              <ion-button expand="block" class="ionic-primary-btn" @click="goSearch('photographer')" style="--background: #8B7355;">
                <img src="/images/camera.png" class="btn-icon" style="margin-right: 8px;" />
                Find Photographers
              </ion-button>
            </div>

            <div class="auth-buttons">
              <ion-button fill="outline" class="ionic-outline-btn" @click="router.push('/register')" style="--color: #C89F8A; --border-color: #C89F8A;">
                Sign up
              </ion-button>

              <ion-button fill="solid" class="ionic-solid-btn" @click="router.push('/login')" style="--background: #C89F8A; --color: white;">
                Sign in
              </ion-button>
            </div>

          </div>
        </section>

        <main class="main-content">
          <section class="about">
            <div class="container">
              <h2>About Us</h2>
              <p>
                Booki Booki is an online platform that makes it easy to find and book
                professional makeup artists and photographers. Customers can book
                services quickly, while service providers manage schedules and bookings
                in one simple place.
              </p>
            </div>
          </section>
        </main>

      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.ionic-primary-btn {
  margin-bottom: 12px;
  height: 56px;
  --border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
}
.ionic-outline-btn, .ionic-solid-btn {
  flex: 1;
  height: 48px;
  --border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
}
</style>