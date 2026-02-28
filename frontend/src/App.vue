<template>
  <div class="app-wrapper">

    <!-- เนื้อหาของแต่ละหน้า -->
    <router-view />

    <!-- Footer ทุกหน้า -->
    <footer class="footer">
      <p>Booki Booki</p>
      <p>An online booking platform for makeup artists and photographers.</p>
      <p>© 2026 College of Computing | Khon Kaen University</p>
    </footer>

  </div>
</template>

<style>

/* ===== Reset ===== */
html,
body,
#app {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;
}

/* ===== Wrapper ===== */
.app-wrapper {
  min-height: 100vh;
  background-color: #f0f2f5;

  /* ✅ ทำ sticky footer */
  display: flex;
  flex-direction: column;
}

/* ทำให้ content ดัน footer ลงล่าง */
.app-wrapper > :first-child {
  flex: 1;
}

/* ===== Footer ===== */
.footer {
  width: 100%;
  background: #2C1810;
  color: #C89F8A;
  text-align: center;
  padding: 40px 20px;
  font-size: 14px;
}

</style>