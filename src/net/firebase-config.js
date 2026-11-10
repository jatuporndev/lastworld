// Firebase project configuration.
// 1. Create a project at https://console.firebase.google.com
// 2. Enable Authentication → Sign-in methods: Email/Password and Anonymous
// 3. Create a Realtime Database and paste database.rules.json into its Rules tab
// 4. Project settings → Your apps → Web app → copy the config values below
// While these values are left as placeholders the game runs in offline mode (saves to this browser).
export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FB_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env?.VITE_FB_AUTH_DOMAIN || 'YOUR_PROJECT.firebaseapp.com',
  databaseURL: import.meta.env?.VITE_FB_DATABASE_URL || 'https://YOUR_PROJECT-default-rtdb.firebaseio.com',
  projectId: import.meta.env?.VITE_FB_PROJECT_ID || 'YOUR_PROJECT',
  appId: import.meta.env?.VITE_FB_APP_ID || 'YOUR_APP_ID',
};
