import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import type { Table } from "@tanstack/react-table";

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide());
  const selectedKeys = new Set(
    hideableColumns.filter((column) => column.getIsVisible()).map((column) => column.id),
  );

  return (
    <DropdownMenuTrigger>
      <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
        <MixerHorizontalIcon className="mr-2 h-4 w-4" />
        View
      </Button>
      <DropdownMenu
        placement="bottom end"
        className="w-[150px]"
        selectionMode="multiple"
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => {
          if (keys === "all") {
            for (const column of hideableColumns) {
              column.toggleVisibility(true);
            }
            return;
          }
          for (const column of hideableColumns) {
            column.toggleVisibility(keys.has(column.id));
          }
        }}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hideableColumns.map((column) => (
            <DropdownMenuItem key={column.id} id={column.id} className="capitalize">
              {column.id}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
