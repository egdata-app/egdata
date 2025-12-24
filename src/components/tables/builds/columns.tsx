import { textPlatformIcons } from "@/components/app/platform-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateSize } from "@/lib/calculate-size";
import type { Build } from "@/types/builds";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { DateTime } from "luxon";

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

export const columns: ColumnDef<Build>[] = [
  {
    accessorKey: "_id",
    header: "ID",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      return (
        <Link to="/builds/$id" params={{ id: info.getValue() as string }} className="font-mono text-badge">
          {info.getValue() as string}
        </Link>
      );
    },
  },
  {
    accessorKey: "buildVersion",
    header: "Version",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      const version = info.getValue() as string;
      const displayVersion = version.split("+")[0];
      return (
        <Tooltip>
          <TooltipTrigger>
            <span className="font-mono underline decoration-dotted underline-offset-4">
              {displayVersion.length > 20 ? `${displayVersion.slice(0, 20)}...` : displayVersion}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-mono">{version}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "appName",
    header: "App Name",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      const name = info.getValue() as string;

      if (name.length > 20) {
        return (
          <Tooltip>
            <TooltipTrigger>{name.slice(0, 20)}...</TooltipTrigger>
            <TooltipContent className="max-w-xs">{name}</TooltipContent>
          </Tooltip>
        );
      }

      return <span className="font-mono">{info.getValue() as string}</span>;
    },
  },
  {
    accessorKey: "hash",
    header: "Hash",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      const name = info.getValue() as string;
      return (
        <Tooltip>
          <TooltipTrigger className="font-mono">
            {name.slice(0, 6)}...{name.slice(-6)}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{name}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "labelName",
    header: "Platform",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      const platform = (info.getValue() as string).split("-")[1];
      return (
        <div className="flex flex-row gap-2 items-center justify-center">
          {textPlatformIcons[platform]}
        </div>
      );
    },
    filterFn: (row, columnId, value: string[]) => {
      const data = row.original;

      const platform = data.labelName.split("-")[1];

      if (value.length === 0) {
        return true;
      }

      return value.includes(platform);
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
    accessorKey: "createdAt",
    header: "Created At",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      return DateTime.fromISO(info.getValue() as string)
        .setLocale("en-GB")
        .toLocaleString({
          year: "numeric",
          month: "long",
          day: "numeric",
        });
    },
    sortingFn: (a, b) => {
      const aDate = new Date(a.original.createdAt);
      const bDate = new Date(b.original.createdAt);

      if (aDate < bDate) {
        return -1;
      }

      if (aDate > bDate) {
        return 1;
      }

      return 0;
    },
  },
];
