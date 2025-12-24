import { Badge } from "@/components/ui/badge";
import { offersDictionary } from "@/lib/offers-dictionary";
import type { SingleOffer } from "@/types/single-offer";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { DateTime } from "luxon";

export const types: {
  value: keyof typeof offersDictionary;
  label: string;
}[] = Object.entries(offersDictionary).map(([key, value]) => ({
  value: key as keyof typeof offersDictionary,
  label: value,
}));

export const columns: ColumnDef<SingleOffer>[] = [
  {
    accessorKey: "id",
    header: "ID",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      return (
        <Link className="text-badge font-mono" to="/offers/$id" params={{ id: info.getValue() as string }}>
          {(info.getValue() as string).slice(0, 4)}...
          {(info.getValue() as string).slice(-4)}
        </Link>
      );
    },
  },
  {
    accessorKey: "title",
    header: "Title",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "offerType",
    header: "Type",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) =>
      offersDictionary[info.getValue() as keyof typeof offersDictionary] ?? info.getValue(),
  },
  {
    accessorKey: "prePurchase",
    header: "Pre-Purchase",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      const data = info.getValue();
      return (
        <div className="flex flex-row items-center justify-center gap-2">
          {data === true && (
            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
              Pre-Purchase
            </Badge>
          )}
        </div>
      );
    },
    filterFn: (row, columnId, value) => {
      const data = row.original;
      return data.prePurchase === value;
    },
  },
  {
    accessorKey: "seller",
    header: "Seller",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      const seller = info.getValue() as SingleOffer["seller"];
      return (
        <Link to="/sellers/$id" params={{ id: seller.id }} className="text-badge">
          {seller.name as string}
        </Link>
      );
    },
  },
  {
    accessorKey: "lastModifiedDate",
    header: "Last Modified",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) =>
      DateTime.fromISO(info.getValue() as string)
        .setLocale("en-GB")
        .toLocaleString({
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
  },
];
