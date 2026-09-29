import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.doonriders.technician',
  appName: 'DOON Riders Technician',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true
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
