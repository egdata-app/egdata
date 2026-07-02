import { JsonVisualizer } from "@/components/app/json-tree";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { httpClient } from "@/lib/http-client";
import type { SingleItem } from "@/types/single-item";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

const jsonAttributes = ["RequirementsJson", "SysTrayRestore"];

export const Route = createFileRoute("/items/$id/")({
  component: () => {
    const { t } = useTranslation();
    const { id } = Route.useParams();
    const { data: item } = useQuery({
      queryKey: ["item", { id }],
      queryFn: () => httpClient.get<SingleItem>(`/items/${id}`),
    });

    if (!item) {
      return null;
    }

    return (
      <div className="flex flex-col items-start justify-start h-full gap-4 w-full">
        <h2 className="text-xl font-bold">{t("items.metadata.title")}</h2>
        <div className="w-full overflow-hidden rounded-xl border border-border/10">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] md:w-[300px]">{t("items.metadata.key")}</TableHead>
                <TableHead className="border-l-border/10 border-l">
                  {t("items.metadata.value")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(item.customAttributes)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{key}</TableCell>
                    <TableCell className="border-l-border/10 border-l font-mono">
                      {jsonAttributes.includes(key) && (
                        <JsonVisualizer data={JSON.parse(value.value)} />
                      )}
                      {!jsonAttributes.includes(key) && value.value}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  },
});
