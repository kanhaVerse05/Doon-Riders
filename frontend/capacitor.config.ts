import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.doonriders.technician',
  appName: 'DOON Riders Technician',
  webDir: 'public',
  server: {
    url: 'https://doon-riders.vercel.app/technician/login',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#070D18',
      showSpinner: true,
      spinnerColor: '#00D96B'
    }
  }
};

export default config;
