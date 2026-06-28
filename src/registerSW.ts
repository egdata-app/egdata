let waitingWorker: ServiceWorker | null = null;
let reloadOnControllerChange = false;
let isRefreshing = false;
const serviceWorkerUrl = `/sw.js?v=${encodeURIComponent(__SW_VERSION__)}`;

const updateSW = async (reloadPage = false) => {
  if (reloadPage) {
    reloadOnControllerChange = true;
  }

  if (waitingWorker) {
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    return;
  }

  if (reloadPage && typeof window !== "undefined") {
    window.location.reload();
  }
};

const rememberWaitingWorker = (worker: ServiceWorker) => {
  waitingWorker = worker;
};

const activateWaitingWorker = (worker: ServiceWorker) => {
  rememberWaitingWorker(worker);
  worker.postMessage({ type: "SKIP_WAITING" });
};

const canRegister =
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  import.meta.env.PROD;

if (canRegister) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloadOnControllerChange || isRefreshing) {
      return;
    }

    isRefreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .register(serviceWorkerUrl, { type: "module", scope: "/", updateViaCache: "none" })
    .then((registration) => {
      console.log("SW Registered:", registration);

      if (registration.waiting && navigator.serviceWorker.controller) {
        activateWaitingWorker(registration.waiting);
      }

      void registration.update().catch((error: unknown) => {
        console.log("SW update check error", error);
      });

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;

        if (!worker) {
          return;
        }

        worker.addEventListener("statechange", () => {
          if (worker.state !== "installed" || !navigator.serviceWorker.controller) {
            return;
          }

          activateWaitingWorker(worker);
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
