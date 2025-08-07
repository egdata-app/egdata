import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    // Show a prompt to user to refresh the app
    if (confirm('New content available, reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  onRegistered(r) {
    console.log(`SW Registered: ${r}`);
  },
  onRegisterError(error) {
    console.log('SW registration error', error);
  },
});

export { updateSW };