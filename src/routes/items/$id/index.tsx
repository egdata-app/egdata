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

const jsonAttributes = ["RequirementsJson", "SysTrayRestore"];

export const Route = createFileRoute("/items/$id/")({
  component: () => {
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
        <h2 className="text-xl font-bold">Metadata</h2>
        <div className="rounded-xl border border-gray-300/10 w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Key</TableHead>
                <TableHead className="border-l-gray-300/10 border-l">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(item.customAttributes)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{key}</TableCell>
                    <TableCell className="border-l-gray-300/10 border-l font-mono">
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
