<style src="src/styles/home.css"></style>
<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goSearch = (role: string) => {
  // ส่ง query string ไปให้หน้า Search ฟิลเตอร์อัตโนมัติ
  router.push(`/search?role=${role}`);
};
</script>

<template>
  <div class="page">
    
    <!-- HERO -->
    <section class="hero">
      <div class="hero-inner">

        <!-- LOGO -->
        <img
          src="/images/Bookibooki.png"
          alt="BookiBooki Logo"
          class="logo"
        />

        <div class="action-buttons">

          <button class="btn-primary" @click="goSearch('makeup')">
            <img src="/images/brush.png" class="btn-icon" />
            Find Makeup Artists
          </button>

          <button class="btn-primary" @click="goSearch('photographer')">
            <img src="/images/camera.png" class="btn-icon" />
            Find Photographers
          </button>

        </div>

        <div class="auth-buttons">
          <button class="btn-outline" @click="router.push('/register')">
            Sign up
          </button>

          <button class="btn-solid" @click="router.push('/login')">
            Sign in
          </button>
        </div>

      </div>
    </section>

    <!-- ABOUT -->
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
</template>
