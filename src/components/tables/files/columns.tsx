import { calculateSize } from "@/lib/calculate-size";
import type { File } from "@/types/builds";
import type { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getHashType } from "@/lib/get-hash-type";
import { fileTypes } from "@/lib/filetypes";

export const columns: ColumnDef<File>[] = [
  {
    accessorKey: "fileName",
    header: "File name",
    cell: ({ getValue }) => {
      const fileName = getValue() as string;
      return <span className="font-mono">{fileName}</span>;
    },
  },
  {
    accessorKey: "fileHash",
    header: "Hash",
    cell: ({ getValue }) => {
      const hash = getValue() as string | undefined;
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-mono cursor-help inline-flex gap-2 items-center justify-center">
              {`${hash?.slice(0, 6)}...${hash?.slice(-6)}`}
              <span className="text-xs text-gray-400">({getHashType(hash ?? "")})</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-mono">{hash}</span>
          </TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "mimeType",
    header: "Type",
    cell: ({ getValue, row }) => {
      const mimeType = getValue() as string;
      const filename = row.original.fileName;
      return (
        <span className="font-mono">
          {fileTypes[mimeType] ??
            fileTypes[filename.split(".").pop() as string] ??
            filename.split(".").pop()?.toUpperCase()}
        </span>
      );
    },
  },
  {
    accessorKey: "fileSize",
    header: "Size",
    cell: ({ getValue }) => {
      const size = getValue() as number;
      return <span className="font-mono">{calculateSize(size)}</span>;
    },
  },
];
