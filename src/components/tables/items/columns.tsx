import { textPlatformIcons } from "@/components/app/platform-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SingleItem } from "@/types/single-item";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AtomIcon,
  BadgeCheckIcon,
  BookMarkedIcon,
  CalendarCheckIcon,
  MonitorCogIcon,
  MoonIcon,
  UserIcon,
  WandIcon,
} from "lucide-react";

export const types: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "EXECUTABLE",
    label: "Executable",
    icon: MonitorCogIcon,
  },
  {
    value: "AUDIENCE",
    label: "Audience",
    icon: UserIcon,
  },
  {
    value: "ENTITLEMENT",
    label: "Entitlement",
    icon: AtomIcon,
  },
  {
    value: "INGAMEITEM",
    label: "In-game item",
    icon: BookMarkedIcon,
  },
  {
    value: "SUBSCRIPTION",
    label: "Subscription",
    icon: CalendarCheckIcon,
  },
  {
    value: "TEST",
    label: "Test",
    icon: WandIcon,
  },
];

export const statuses: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "ACTIVE",
    label: "Active",
    icon: BadgeCheckIcon,
  },
  {
    value: "SUNSET",
    label: "Sunset",
    icon: MoonIcon,
  },
];

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

export const columns: ColumnDef<SingleItem>[] = [
  {
    accessorKey: "id",
    header: "ID",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      return (
        <Link className="text-badge font-mono" to={`/items/${info.getValue()}`}>
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
    cell: (info) => {
      const textLength = (info.getValue() as string).length;
      if (textLength <= 40) {
        return info.getValue() as string;
      }
      return (
        <Tooltip>
          <TooltipTrigger>{(info.getValue() as string).slice(0, 40)}...</TooltipTrigger>
          <TooltipContent className="max-w-xs">{info.getValue() as string}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "entitlementType",
    header: "Type",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "developer",
    header: "Developer",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => {
      const developer = info.getValue();
      const id = info.row.original.developerId;
      return (
        <Link to={`/sellers/${id}`} className="text-badge">
          {developer as string}
        </Link>
      );
    },
  },
  {
    accessorKey: "platforms",
    header: "Platforms",
    enableSorting: true,
    enableColumnFilter: true,
    getUniqueValues: ({ releaseInfo }) => {
      return releaseInfo.flatMap((release) => release.platform);
    },
    cell: (info) => {
      const platforms = info.row.original.releaseInfo.flatMap((release) => release.platform);
      return (
        <div className="flex flex-row gap-2 items-center justify-center">
          {platforms.map((platform) => (
            <span key={platform} title={platform}>
              {textPlatformIcons[platform]}
            </span>
          ))}
        </div>
      );
    },
    filterFn: (row, columnId, value) => {
      console.log(row, columnId, value);
      const data = row.original;

      const rowPlatforms = data.releaseInfo.flatMap((release) => release.platform);

      if (value.length === 0) {
        return true;
      }

      return rowPlatforms.some((platform) => value.includes(platform));
    },
  },
  {
    accessorKey: "lastModifiedDate",
    header: "Last Modified",
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) =>
      new Date(info.getValue() as string).toLocaleDateString("en-UK", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
  },
];
