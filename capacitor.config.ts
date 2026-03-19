import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'jp.qurio.app',
  appName: 'Qurios',
  webDir: 'out',
  server: {
    url: 'https://qurio.vercel.app',
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#F7F8FA',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#F7F8FA',
  },
};

export default config;
