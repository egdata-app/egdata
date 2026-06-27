let waitingWorker: ServiceWorker | null = null;
let reloadOnControllerChange = false;
let isRefreshing = false;

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
    .register("/sw.js", { type: "module" })
    .then((registration) => {
      console.log("SW Registered:", registration);

      if (registration.waiting && navigator.serviceWorker.controller) {
        rememberWaitingWorker(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;

        if (!worker) {
          return;
        }

        worker.addEventListener("statechange", () => {
          if (worker.state !== "installed" || !navigator.serviceWorker.controller) {
            return;
          }

          rememberWaitingWorker(worker);
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
