import { Workbox } from "workbox-window";

const updateSW =
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  import.meta.env.PROD &&
  "serviceWorker" in navigator
    ? (() => {
        const workbox = new Workbox("/sw.js", { type: "module" });

        workbox.addEventListener("waiting", () => {
          if (window.confirm("New content available, reload?")) {
            updateSW(true);
          }
        });

        workbox.addEventListener("activated", () => {
          console.log("App ready to work offline");
        });

        workbox.addEventListener("controlling", () => {
          window.location.reload();
        });

        const registrationPromise = workbox
          .register()
          .then((registration) => {
            console.log(`SW Registered: ${registration}`);
            return registration;
          })
          .catch((error) => {
            console.log("SW registration error", error);
            return undefined;
          });

        return async (reloadPage = false) => {
          if (reloadPage) {
            workbox.messageSkipWaiting();
          }

          await registrationPromise;
        };
      })()
    : async () => {};

export { updateSW };
