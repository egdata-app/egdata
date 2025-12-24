import { useQuery } from "@tanstack/react-query";
import { httpClient as client } from "@/lib/http-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";

export interface Stats {
  offers: number;
  items: number;
  tags: number;
  assets: number;
  priceEngine: number;
  changelog: number;
  sandboxes: number;
  products: number;
  offersYear: number;
  itemsYear: number;
}

export function StatsModule() {
  const { data } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const data = await client.get<Stats>("/stats");
      return data;
    },
  });

  return (
    <Card className="md:w-1/2 h-full my-auto w-full">
      <CardHeader className="flex flex-col">
        <h2 className="text-xl font-semibold">Stats</h2>
        <p className="text-sm text-gray-500">Statistics about the platform</p>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4 h-[300px]">
        <Count
          value={data?.offers ?? 0}
          label="Offers"
          tooltip="An offer is a purchasable item from the store"
        />
        <Count
          value={data?.items ?? 0}
          label="Items"
          tooltip="An item is the entiltlement for the launcher"
        />
        <Count value={data?.tags ?? 0} label="Tags" />
        <Count value={data?.offersYear ?? 0} label="Offers (Year)" />
        <Count value={data?.itemsYear ?? 0} label="Items (Year)" />
        <Count value={data?.assets ?? 0} label="Assets" tooltip="An asset is the game files" />
        <Count value={data?.priceEngine ?? 0} label="Reg. Prices" />
        <Count value={data?.changelog ?? 0} label="Changes" />
        <Count
          value={data?.sandboxes ?? 0}
          label="Sandboxes"
          tooltip="A sandbox is the group of offers"
        />
      </CardContent>
    </Card>
  );
}

function Count({ value, label, tooltip }: { value: number; label: string; tooltip?: string }) {
  return (
    <div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            className={cn(
              "text-xs text-gray-500",
              tooltip ? "underline decoration-dotted underline-offset-4" : "cursor-default",
            )}
          >
            {label}
          </TooltipTrigger>
          {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
      <p className="text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
