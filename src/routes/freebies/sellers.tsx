import i18n from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { httpClient } from "@/lib/http-client";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Download, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

const freebiesSellersQuery = queryOptions({
  queryKey: ["freebies-sellers"],
  queryFn: () =>
    httpClient
      .get<
        {
          totalSingleGames: number;
          sellerId: string;
          sellerName: string;
        }[]
      >("/free-games/sellers")
      .catch(() => []),
});

export const Route = createFileRoute("/freebies/sellers")({
  component: RouteComponent,

  loader: async ({ context }) => {
    const { queryClient } = context;

    await queryClient.prefetchQuery(freebiesSellersQuery);
  },
});

type SortDirection = "asc" | "desc";

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sellersToCSV(sellers: { sellerName: string; totalSingleGames: number }[]) {
  const header = "Seller Name,Total Single Games";
  const rows = sellers.map((s) => `"${s.sellerName.replace(/"/g, '""')}",${s.totalSingleGames}`);
  return [header, ...rows].join("\n");
}

function sellersToText(sellers: { sellerName: string; totalSingleGames: number }[]) {
  return sellers.map((s) => `${s.sellerName}: ${s.totalSingleGames}`).join("\n");
}

function RouteComponent() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery(freebiesSellersQuery);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredData = data?.filter((seller) =>
    seller.sellerName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sortedData = filteredData?.sort((a, b) => {
    if (sortDirection === "desc") {
      return b.totalSingleGames - a.totalSingleGames;
    }
    return a.totalSingleGames - b.totalSingleGames;
  });

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  // Prepare data for download (filtered and sorted)
  const downloadData =
    sortedData?.map(({ sellerName, totalSingleGames }) => ({
      sellerName,
      totalSingleGames,
    })) || [];

  // Handle click outside to close menu
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (showDownloadMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDownloadMenu]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-destructive">{t("freebies.errors.loadSellers")}</div>;
  }

  return (
    <div className="container mx-auto px-2 py-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 w-full max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-foreground">{t("freebies.headings.sellers")}</h1>
        <div className="inline-flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("freebies.placeholders.searchSellers")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 bg-muted border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t("freebies.aria.downloadList")}
                className="border border-border rounded-md p-2"
              >
                <Download className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={12} className="w-48 p-0">
              <div className="flex flex-col">
                <button
                  type="button"
                  className="px-4 py-2 text-left hover:bg-muted transition-colors"
                  onClick={() => {
                    downloadFile(
                      "sellers.json",
                      JSON.stringify(downloadData, null, 2),
                      "application/json",
                    );
                  }}
                >
                  {t("freebies.buttons.downloadJson")}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-left hover:bg-muted transition-colors"
                  onClick={() => {
                    downloadFile("sellers.csv", sellersToCSV(downloadData), "text/csv");
                  }}
                >
                  {t("freebies.buttons.downloadCsv")}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-left hover:bg-muted transition-colors"
                  onClick={() => {
                    downloadFile("sellers.txt", sellersToText(downloadData), "text/plain");
                  }}
                >
                  {t("freebies.buttons.downloadTxt")}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full max-w-2xl mx-auto border border-border rounded-lg text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">
                {t("freebies.table.sellerName")}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={toggleSort}
                >
                  {t("freebies.table.totalGames")}
                  {sortDirection === "desc" ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUp className="h-3 w-3" />
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData?.map((seller) => (
              <tr key={seller.sellerId} className="hover:bg-accent/50 transition-colors">
                <td className="px-3 py-2 whitespace-nowrap font-medium">
                  <Link
                    to="/sellers/$id"
                    params={{ id: seller.sellerId }}
                    className="hover:text-primary transition-colors"
                  >
                    {seller.sellerName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{seller.totalSingleGames}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
