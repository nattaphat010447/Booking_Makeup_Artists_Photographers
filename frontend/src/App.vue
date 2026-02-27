<template>
  <div class="app-wrapper">
    <router-view />
  </div>
</template>

<style>

/* ===== Reset พื้นฐาน ===== */
html,
body,
#app {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;
}

/* ===== Wrapper หลัก ===== */
.app-wrapper {
  width: 100%;
  min-height: 100vh;
  background-color: #f0f2f5;
}

</style>