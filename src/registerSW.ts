import { registerSW } from "virtual:pwa-register";

const updateSW =
  typeof window !== "undefined" && typeof navigator !== "undefined"
    ? registerSW({
        onNeedRefresh() {
          // Show a prompt to user to refresh the app
          if (window.confirm("New content available, reload?")) {
            updateSW(true);
          }
        },
        onOfflineReady() {
          console.log("App ready to work offline");
        },
        onRegistered(r) {
          console.log(`SW Registered: ${r}`);
        },
        onRegisterError(error) {
          console.log("SW registration error", error);
        },
      })
    : async () => {};

export { updateSW };
