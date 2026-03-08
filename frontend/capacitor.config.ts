import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookibooki.app',
  appName: 'com.bookibooki.app',
  webDir: 'dist',
  "server": {
    "url": "http://localhost:5173",
    "cleartext": true
  }
};

export default config;
