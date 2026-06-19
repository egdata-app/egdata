import type { SingleOffer } from "@/types/single-offer";
import { Button } from "../aria/button";
import { EpicGamesIcon } from "../icons/epic";

function trackEvent(offer: SingleOffer) {
  window.umami?.track("open-egl", {
    id: offer.id,
    namespace: offer.namespace,
  });
}

export function OpenEgl({ offer }: { offer: SingleOffer }) {
  const urlType: "product" | "url" = offer.offerType === "BASE_GAME" ? "product" : "url";
  const isBundle = offer.offerType === "BUNDLE";
  const namespace = isBundle ? "bundles" : "product";
  const url =
    offer.customAttributes?.["com.epicgames.app.productSlug"]?.value ??
    offer.offerMappings?.[0]?.pageSlug ??
    offer.urlSlug ??
    (urlType === "product" ? offer.productSlug : offer.urlSlug);

  if (!url) {
    return null;
  }

  return (
    <Button
      variant="outline"
      className="bg-surface-ground text-text-primary dark:hover:text-text-primary hover:bg-surface-panel focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:bg-surface-panel dark:hover:bg-surface-hover dark:focus:ring-gray-700"
      onClick={() => {
        trackEvent(offer);
        open(`com.epicgames.launcher://store/${namespace}/${url}?utm_source=egdata.app`);
      }}
    >
      <div className="flex items-center justify-center gap-2">
        <EpicGamesIcon className="h-6 w-6" />
        <span className="font-semibold">Open</span>
      </div>
    </Button>
  );
}
