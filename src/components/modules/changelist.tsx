import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { UpdateIcon } from "@radix-ui/react-icons";
import { timeAgo } from "@/lib/time-ago";
import { ScrollArea } from "../ui/scroll-area";
import { httpClient } from "@/lib/http-client";
import { useTranslation } from "@/lib/paraglide-react";

export interface Change {
  timestamp: string;
  metadata: Metadata;
  __v: number;
  _id: string;
}

export interface Metadata {
  changes: Change[];
  contextId: string;
  contextType: string;
  context: Context | undefined;
}

export interface Change {
  changeType: string;
  field: string;
  newValue: unknown;
  oldValue: unknown;
}

export interface Context {
  _id: string;
  id: string;
  title: string;
  keyImages: KeyImage[];
  offerType?: string;
}

export interface KeyImage {
  type: string;
  url: string;
  md5: string;
}

const getType = (changes: Change[]) => {
  if (changes.length === 1) {
    return changes[0].changeType === "insert" ? "new" : "update";
  }

  return "update";
};

const icons = {
  update: (
    <span className="text-yellow-500">
      <UpdateIcon />
    </span>
  ),
  new: <span className="text-primary">🆕</span>,
};

export function ChangelistModule() {
  const { t } = useTranslation();
  const {
    isPending,
    error,
    data: changes,
  } = useQuery({
    queryKey: ["changelist", "home"],
    queryFn: async () => {
      return await httpClient.get<Change[]>("/changelist?limit=20");
    },
  });

  if (isPending) {
    return <p>{t("components.changelist.loading")}</p>;
  }

  if (error) {
    return <p>{t("components.changelist.error", { message: error.message })}</p>;
  }

  return (
    <section id="changelist" className="w-full h-full pb-10">
      <h2 className="text-2xl font-bold">{t("components.changelist.title")}</h2>
      <ScrollArea className="w-full h-[400px]">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead>{t("components.changelist.id")}</TableHead>
              <TableHead className="w-[100px]">{t("components.changelist.type")}</TableHead>
              <TableHead>{t("components.changelist.titleOrId")}</TableHead>
              <TableHead className="text-right">{t("components.changelist.date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.map((change) => (
              <TableRow
                key={change._id}
                className="hover:bg-accent/50 transition-colors duration-200"
              >
                <TableCell>
                  <span role="img" aria-label={getType(change.metadata.changes)}>
                    {icons[getType(change.metadata.changes)]}
                  </span>
                </TableCell>
                <TableCell>{change.metadata.contextId.slice(0, 10)}</TableCell>
                <TableCell>{change.metadata.contextType}</TableCell>
                <TableCell>{change.metadata.context?.title || change.metadata.contextId}</TableCell>
                <TableCell className="text-right">{timeAgo(new Date(change.timestamp))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </section>
  );
}
