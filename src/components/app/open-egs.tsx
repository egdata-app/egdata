import type { SingleOffer } from "@/types/single-offer";
import { Button } from "../ui/button";
import { EGSIcon } from "../icons/egs";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useState, useEffect } from "react";

const CREATOR_CODE = "EGDATA";
const CREATOR_CODE_STORAGE_KEY = "egdata_creator_code_shown";

function trackEvent(offer: SingleOffer) {
  window.umami.track("open-egs", {
    id: offer.id,
    namespace: offer.namespace,
  });
}

export function OpenEgs({ offer }: { offer: SingleOffer }) {
  const [showPopover, setShowPopover] = useState(false);
  const [hasSeenPopover, setHasSeenPopover] = useState(true);
  const [useCreatorCode, setUseCreatorCode] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(CREATOR_CODE_STORAGE_KEY);
    setHasSeenPopover(!!hasSeen);
  }, []);

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

  const handleClick = () => {
    trackEvent(offer);
    if (!hasSeenPopover) {
      setShowPopover(true);
      localStorage.setItem(CREATOR_CODE_STORAGE_KEY, "true");
      setHasSeenPopover(true);
    }
  };

  const baseUrl = `https://store.epicgames.com/${namespace}/${url.replaceAll("-pp", "")}?utm_source=egdata.app`;
  const finalUrl = useCreatorCode ? `${baseUrl}&creatorCode=${CREATOR_CODE}` : baseUrl;

  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <Button
          asChild
          className="bg-gray-900 text-white dark:hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
        >
          <a
            href={finalUrl}
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            target="_blank"
            onClick={handleClick}
          >
            <div className="flex items-center justify-center gap-2">
              <EGSIcon className="h-6 w-6" />
              <span className="font-semibold">Store</span>
            </div>
          </a>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Support EGData</h4>
          <p className="text-sm text-muted-foreground">
            Would you like to support EGData by using our creator code when purchasing games?
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUseCreatorCode(false);
                setShowPopover(false);
                window.open(finalUrl, "_blank");
              }}
            >
              No thanks
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setUseCreatorCode(true);
                setShowPopover(false);
                window.open(finalUrl, "_blank");
              }}
            >
              Yes, use code
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
