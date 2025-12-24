import { textPlatformIcons } from "@/components/app/platform-icons";
import { calculateSize } from "@/lib/calculate-size";
import type { Asset } from "@/types/asset";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

export const platforms: {
  value: keyof typeof textPlatformIcons;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "Windows",
    label: "Windows",
    icon: ({ className }) => <span className={className}>{textPlatformIcons.Windows}</span>,
  },
  {
    value: "Mac",
    label: "Mac",
    icon: ({ className }) => <span className={className}>{textPlatformIcons.Mac}</span>,
  },
  {
    value: "Android",
    label: "Android",
    icon: ({ className }) => <span className={className}>{textPlatformIcons.Android}</span>,
  },
  {
    value: "SteamVR / HTC Vive",
    label: "SteamVR",
    icon: ({ className }) => (
      <span className={className}>{textPlatformIcons["SteamVR / HTC Vive"]}</span>
    ),
  },
  {
    value: "Win32",
    label: "Win32",
    icon: ({ className }) => <span className={className}>{textPlatformIcons.Win32}</span>,
  },
  {
    value: "PS4",
    label: "PS4",
    icon: ({ className }) => <span className={className}>{textPlatformIcons.PS4}</span>,
  },
  {
    value: "HTML5",
    label: "HTML5",
    icon: ({ className }) => <span className={className}>{textPlatformIcons.HTML5}</span>,
  },
  {
    value: "Linux",
    label: "Linux",
    icon: ({ className }) => <span className={className}>{textPlatformIcons.Linux}</span>,
  },
  {
    value: "iOS",
    label: "iOS",
    icon: ({ className }) => <span className={className}>{textPlatformIcons.iOS}</span>,
  },
];

export const columns: ColumnDef<Asset, unknown>[] = [
  {
    accessorKey: "title",
    header: "Title",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      const title = info.getValue() as string;
      return <span className="font-mono">{title}</span>;
    },
  },
  {
    accessorKey: "artifactId",
    header: "ID",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      return (
        <span className="font-mono">
          {(info.getValue() as string).slice(0, 4)}...
          {(info.getValue() as string).slice(-4)}
        </span>
      );
    },
  },
  {
    accessorKey: "itemId",
    header: "Item",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      return (
        <Link to={`/items/${info.getValue()}`} className="text-badge font-mono">
          {info.getValue() as string}
        </Link>
      );
    },
  },
  {
    accessorKey: "downloadSizeBytes",
    header: "Download Size",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      return calculateSize(info.getValue() as number);
    },
  },
  {
    accessorKey: "installedSizeBytes",
    header: "Installed Size",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      return calculateSize(info.getValue() as number);
    },
  },
  {
    accessorKey: "platform",
    header: "Platform",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      const platform = info.getValue() as string;
      return (
        <div className="flex flex-row gap-2 items-center justify-center">
          {textPlatformIcons[platform]}
        </div>
      );
    },
  },
];
