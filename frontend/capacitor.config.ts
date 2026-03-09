import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookibooki.app',
  appName: 'com.bookibooki.app',
  webDir: 'dist',
  "server": {
    "url": "http://10.53.62.255:5173",
    "cleartext": true
  }
};

export default config;
