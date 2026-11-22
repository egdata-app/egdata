import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRightIcon, DoubleArrowLeftIcon, DoubleArrowRightIcon } from "@radix-ui/react-icons";
import type { Table } from "@tanstack/react-table";
import { ChevronLeftIcon } from "lucide-react";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  cursorMode?: boolean;
  hasMore?: boolean;
  totalPages?: number | null;
  isPlaceholderData?: boolean;
}

export function DataTablePagination<TData>({
  table,
  cursorMode = false,
  hasMore,
  totalPages,
  isPlaceholderData = false,
}: DataTablePaginationProps<TData>) {
  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageCount = totalPages !== undefined ? totalPages : table.getPageCount();
  const canGoNext = cursorMode ? Boolean(hasMore) && !isPlaceholderData : table.getCanNextPage();

  return (
    <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 text-sm text-muted-foreground" />
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            aria-label="Rows per page"
            placeholder={`${table.getState().pagination.pageSize}`}
            value={`${table.getState().pagination.pageSize}`}
            onChange={(value) => {
              if (value !== null) {
                table.setPageSize(Number(value));
              }
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent placement="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} id={`${pageSize}`} textValue={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-[100px] items-center justify-center text-sm font-medium">
          {pageCount !== null ? `Page ${currentPage} of ${pageCount}` : `Page ${currentPage}`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onPress={() => table.setPageIndex(0)}
            isDisabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onPress={() => table.previousPage()}
            isDisabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onPress={() => table.nextPage()}
            isDisabled={!canGoNext}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          {!cursorMode && (
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onPress={() => table.setPageIndex(table.getPageCount() - 1)}
              isDisabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <DoubleArrowRightIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
