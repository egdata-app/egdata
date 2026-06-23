import type { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import { DataTableViewOptions } from "./view-options";
import { FileExtensionFilter } from "./file-extension";
import { Input } from "@/components/ui/input";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full flex-1 flex-wrap items-center gap-2">
        <Input
          placeholder="Filter files..."
          value={(table.getColumn("fileName")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("fileName")?.setFilterValue(event.target.value)}
          className="h-8 w-full sm:w-[150px] lg:w-[250px]"
        />
        <FileExtensionFilter column={table.getColumn("mimeType")} title="File Extensions" />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
