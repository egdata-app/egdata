import { useQuery } from "@tanstack/react-query";
import { useCountry } from "@/hooks/use-country";
import { httpClient as client } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Image } from "@/components/app/image";
import { getImage } from "@/lib/getImage";
import { Badge } from "../ui/badge";
import { useNavigate } from "@tanstack/react-router";
import { useLocale } from "@/hooks/use-locale";
import { useTranslation } from "@/lib/paraglide-react";
import { localizeHref } from "@/lib/paraglide-strategy";
import { getEffectivePrice } from "@/lib/effective-price";

type UpcomingOffer = Pick<
  SingleOffer,
  | "id"
  | "namespace"
  | "title"
  | "offerType"
  | "keyImages"
  | "seller"
  | "developerDisplayName"
  | "publisherDisplayName"
  | "releaseDate"
  | "prePurchase"
  | "price"
>;

type Res = {
  elements: UpcomingOffer[];
  limit: number;
  start: number;
  page: number;
  count: number;
};

export function UpcomingOffers() {
  const { t } = useTranslation();
  const { country } = useCountry();
  const { timezone } = useLocale();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["upcoming", { country, page: 2 }],
    queryFn: () =>
      client.get<Res>("/offers/upcoming", { params: { country, page: 2 } }).then((res) => res),
  });

  if (isLoading) {
    return (
      <Table>
        <TableCaption>{t("components.upcoming.loading")}</TableCaption>
      </Table>
    );
  }

  return (
    <section id="upcoming-offers" className="mb-8 w-full -mt-4">
      <Table className="mx-auto min-w-[640px] md:w-[73.5vw] md:max-w-full">
        <TableCaption>{t("components.upcoming.caption")}</TableCaption>
        <TableHeader className="hover:bg-accent/50 transition-colors duration-200">
          <TableRow>
            <TableHead className="w-[100px]" />
            <TableHead>{t("components.upcoming.title")}</TableHead>
            <TableHead className="text-right w-[200px]">{t("components.upcoming.price")}</TableHead>
            <TableHead className="text-right">{t("components.upcoming.releaseDate")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.elements?.map((offer) => (
            <TableRow
              key={offer.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors duration-200"
              onClick={(event) => {
                if (event.ctrlKey || event.button === 1) {
                  window.open(localizeHref(`/offers/${offer.id}`), "_blank");
                } else {
                  navigate({ to: "/{-$locale}/offers/$id", params: { id: offer.id } });
                }
              }}
            >
              <TableCell>
                <Image
                  src={
                    getImage(offer.keyImages ?? [], [
                      "OfferImageWide",
                      "DieselGameBoxWide",
                      "DieselStoreFrontWide",
                      "Featured",
                    ])?.url ?? "/300x150-egdata-placeholder.png"
                  }
                  quality="low"
                  alt={offer.title}
                  width={300}
                  height={150}
                  className="object-cover rounded"
                />
              </TableCell>
              <TableCell className="w-1/2">{offer.title}</TableCell>
              <TableCell className="text-right w-[200px]">
                <TablePrice price={offer.price} prePurchase={offer.prePurchase} />
              </TableCell>
              <TableCell className="text-right">
                {new Date(offer.releaseDate).toLocaleDateString("en-UK", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  timeZone: timezone,
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function TablePrice({
  price,
  prePurchase,
}: {
  price: UpcomingOffer["price"] | null;
  prePurchase: boolean | null;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const effectivePrice = getEffectivePrice(price);
  const fmt = Intl.NumberFormat(locale, {
    style: "currency",
    currency: effectivePrice?.price.currencyCode || "USD",
  });

  if (!effectivePrice) {
    return t("components.upcoming.unknown");
  }

  return (
    <div className="inline-flex items-center gap-2">
      {prePurchase && <Badge variant="default">{t("components.upcoming.prePurchase")}</Badge>}
      <span className="text-primary font-bold">
        {fmt.format(effectivePrice.price.discountPrice / 100)}
      </span>
    </div>
  );
}
