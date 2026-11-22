import { getPlatformsArray, textPlatformIcons } from "@/components/app/platform-icons";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import type { SingleItem } from "@/types/single-item";
import { Link } from "@/components/app/localized-link";
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
      const id = (info.getValue() as string | undefined) ?? "";
      if (!id) {
        return <span className="font-mono">-</span>;
      }
      return (
        <Link className="text-badge font-mono" to="/{-$locale}/items/$id" params={{ id }}>
          {id.slice(0, 4)}...{id.slice(-4)}
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
      const title = (info.getValue() as string | undefined) ?? "";
      if (title.length <= 40) {
        return title;
      }
      return (
        <TooltipTrigger>
          <span>{title.slice(0, 40)}...</span>
          <Tooltip className="max-w-xs">{title}</Tooltip>
        </TooltipTrigger>
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
      const developer = info.getValue() as string | undefined;
      const id = info.row.original.developerId;
      if (!developer) {
        return null;
      }
      if (!id) {
        return <span>{developer}</span>;
      }
      return (
        <Link to="/{-$locale}/sellers/$id" params={{ id }} className="text-badge">
          {developer}
        </Link>
      );
    },
  },
  {
    accessorKey: "platforms",
    header: "Platforms",
    enableSorting: true,
    enableColumnFilter: true,
    getUniqueValues: (row) => {
      return getPlatformsArray(row?.releaseInfo);
    },
    cell: (info) => {
      const platforms = getPlatformsArray(info.row.original?.releaseInfo);
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
    filterFn: (row, _columnId, value) => {
      const rowPlatforms = getPlatformsArray(row.original?.releaseInfo);

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
    cell: (info) => {
      const value = info.getValue() as string | undefined;
      if (!value) {
        return null;
      }
      return new Date(value).toLocaleDateString("en-UK", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
  },
];
