"use client";

import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Image } from "./image";
import { useNavigate } from "@tanstack/react-router";
import type { IsPrepurchase } from "@/types/prepurchase";
import { getImage } from "@/lib/get-image";
import { useLocalStorage } from "@uidotdev/usehooks";

const normalizeDate = (dateString: string) => new Date(dateString).getTime();

export function PrepurchasePopup({ id }: { id: string }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, saveDismissed] = useLocalStorage<string | null>(
    `prepurchase-popup-${id}`,
    null,
  );
  const [offerQuery, prepurchaseOfferQuery] = useQueries({
    queries: [
      {
        queryKey: ["offer", { id }],
        queryFn: () => httpClient.get<SingleOffer>(`/offers/${id}`),
      },
      {
        queryKey: ["offer", "prepurchase-offers", { id }],
        queryFn: () => httpClient.get<IsPrepurchase>(`/offers/${id}/has-regular`),
      },
    ],
  });

  const { data: offer } = offerQuery;
  const { data: prepurchaseOffer } = prepurchaseOfferQuery;

  useEffect(() => {
    if (
      offer &&
      prepurchaseOffer &&
      prepurchaseOffer.isPrepurchase &&
      normalizeDate(prepurchaseOffer.offer.releaseDate) < Date.now()
    ) {
      if (!isDismissed) {
        setIsOpen(true);
      }
    }
  }, [offer, prepurchaseOffer, isDismissed]);

  const handleDismiss = (open: boolean) => {
    if (open) {
      setIsOpen(true);
      saveDismissed(null);
    } else {
      setIsOpen(false);
      saveDismissed(new Date().toISOString());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Pre-purchase Offer
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 text-center">
          <div className="mb-4">
            <Image
              src={
                getImage(offer?.keyImages ?? [], [
                  "DieselStoreFrontWide",
                  "OfferImageWide",
                  "DieselGameBoxWide",
                  "TakeoverWide",
                ])?.url ?? "https://cdn.egdata.app/placeholder-1080.webp"
              }
              alt={offer?.title ?? ""}
              width={600}
              height={350}
              className="rounded-lg mx-auto"
            />
          </div>
          <h3 className="text-lg font-bold mb-2">{offer?.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This is a pre-purchase offer for a game that has been released.
            <br />
            You can check the regular offer information following this link.
          </p>

          <Button
            variant="outline"
            onClick={() => {
              saveDismissed(new Date().toISOString());
              setIsOpen(false);
              navigate({
                to: `/offers/${prepurchaseOffer?.offer.id}`,
              });
            }}
          >
            View Regular Offer
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            This popup will not appear again for this game.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
