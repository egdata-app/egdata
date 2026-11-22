import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { DataTableToolbar } from "./toolbar";
import { DataTablePagination } from "./pagination";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/components/app/localized-link";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  emptyContent?: React.ReactNode;
  data: TData[];
  setPage: React.Dispatch<
    React.SetStateAction<{
      pageIndex: number;
      pageSize: number;
    }>
  >;
  page: {
    pageIndex: number;
    pageSize: number;
  };
  total: number | null;
  hasMore?: boolean;
  cursorMode?: boolean;
  isPlaceholderData?: boolean;
  filters: ColumnFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
}

export function DataTable<TData, TValue>({
  columns,
  emptyContent,
  data,
  setPage,
  page,
  total,
  hasMore,
  cursorMode = false,
  isPlaceholderData = false,
  filters,
  setFilters,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "createdAt",
      desc: true,
    },
  ]);
  const totalPages = total !== null ? Math.max(1, Math.ceil(total / page.pageSize)) : null;

  const table = useReactTable({
    data,
    columns,
    pageCount: totalPages ?? (hasMore ? page.pageIndex + 2 : page.pageIndex + 1),
    state: {
      sorting,
      rowSelection,
      columnFilters: filters,
      pagination: page,
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onPaginationChange: setPage,
    manualPagination: true,
    manualFiltering: true,
  });

  return (
    <div className="space-y-4 w-full">
      <DataTableToolbar table={table} />
      <div className="w-full overflow-hidden rounded-md border">
        <Table className="min-w-[760px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center w-full gap-2">
                  {emptyContent ?? (
                    <>
                      <p className="mb-4">No results.</p>
                      <Link
                        to="/{-$locale}/donate-key"
                        className={buttonVariants({ variant: "outline" })}
                      >
                        Donate a Key
                      </Link>
                    </>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        table={table}
        cursorMode={cursorMode}
        hasMore={hasMore}
        totalPages={totalPages}
        isPlaceholderData={isPlaceholderData}
      />
    </div>
  );
}
