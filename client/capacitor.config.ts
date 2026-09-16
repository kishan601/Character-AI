import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aegis.app',
  appName: 'Aegis',
  webDir: 'dist',
  android: {
    // Allow HTTP requests from within the WebView to LAN addresses (e.g. 192.168.x.x:3001)
    // Without this, Android WebView treats http://localhost as a secure context and blocks
    // all outgoing HTTP fetch requests as "mixed content".
    allowMixedContent: true,
    // Enable remote debugging via chrome://inspect
    webContentsDebuggingEnabled: true,
  },
};

export default config;
