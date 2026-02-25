<template>
  <div class="mobile-container">
    <router-view />
  </div>
</template>

<style>

body {
  background-color: #f0f2f5;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  margin: 0;
}
.mobile-container {
  width: 100%;
  max-width: 390px;
  min-height: 100vh;
  background-color: #ffffff;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow-x: hidden;
}
</style>