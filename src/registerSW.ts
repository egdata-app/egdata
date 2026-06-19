let waitingWorker: ServiceWorker | null = null;

const updateSW = async (reloadPage = false) => {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  if (reloadPage && typeof window !== "undefined") {
    window.location.reload();
  }
};

const canRegister =
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  import.meta.env.PROD;

if (canRegister) {
  navigator.serviceWorker
    .register("/sw.js", { type: "module" })
    .then((registration) => {
      console.log("SW Registered:", registration);

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;

        if (!worker) {
          return;
        }

        worker.addEventListener("statechange", () => {
          if (worker.state !== "installed" || !navigator.serviceWorker.controller) {
            return;
          }

          waitingWorker = worker;

          if (window.confirm("New content available, reload?")) {
            void updateSW(true);
          }
        });
      });
    })
    .catch((error: unknown) => {
      console.log("SW registration error", error);
    });

  navigator.serviceWorker.ready
    .then(() => {
      console.log("App ready to work offline");
    })
    .catch((error: unknown) => {
      console.log("SW ready error", error);
    });
}

export { updateSW };
