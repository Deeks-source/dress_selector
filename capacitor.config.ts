import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stylemind.app',
  appName: 'StyleMind',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      androidClientId: '777684619264-9rvas3qsfegtatujbqsdsivkpr8lk0d6.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
