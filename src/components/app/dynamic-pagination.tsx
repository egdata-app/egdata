import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
} from "@/components/ui/pagination";

interface PaginationProps {
  currentPage: number;
  totalPages: number | null;
  setPage: (page: number) => void;
  hasMore?: boolean;
  cursorMode?: boolean;
}

export const DynamicPagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  setPage,
  hasMore,
  cursorMode = false,
}) => {
  const items: React.ReactNode[] = [];
  const effectiveTotalPages = totalPages ?? currentPage;
  const canGoNext =
    hasMore !== undefined ? hasMore : totalPages !== null && currentPage < totalPages;

  // Previous button
  items.push(
    <PaginationItem key="prev">
      <PaginationPrevious onPress={() => setPage(currentPage - 1)} isDisabled={currentPage <= 1} />
    </PaginationItem>,
  );

  // First page
  if (cursorMode) {
    items.push(
      <PaginationItem key={1}>
        <PaginationLink onPress={() => setPage(1)} isActive={currentPage === 1}>
          1
        </PaginationLink>
      </PaginationItem>,
    );

    if (currentPage >= 2) {
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="start-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }

      if (currentPage > 2) {
        items.push(
          <PaginationItem key={currentPage - 1}>
            <PaginationLink onPress={() => setPage(currentPage - 1)}>
              {currentPage - 1}
            </PaginationLink>
          </PaginationItem>,
        );
      }

      items.push(
        <PaginationItem key={currentPage}>
          <PaginationLink onPress={() => setPage(currentPage)} isActive>
            {currentPage}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (totalPages !== null && totalPages > currentPage) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
      items.push(
        <PaginationItem key="total-label">
          <span className="px-2 text-xs text-muted-foreground tabular-nums">{totalPages}</span>
        </PaginationItem>,
      );
    }
  } else {
    // First two pages
    if (effectiveTotalPages >= 1) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink onPress={() => setPage(1)} isActive={currentPage === 1}>
            1
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (effectiveTotalPages >= 2) {
      items.push(
        <PaginationItem key={2}>
          <PaginationLink onPress={() => setPage(2)} isActive={currentPage === 2}>
            2
          </PaginationLink>
        </PaginationItem>,
      );
    }

    // Ellipsis after first two pages
    if (currentPage > 3 && effectiveTotalPages > 5) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    // Current page
    if (currentPage > 2 && currentPage < effectiveTotalPages - 1) {
      items.push(
        <PaginationItem key={currentPage}>
          <PaginationLink onPress={() => setPage(currentPage)} isActive>
            {currentPage}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    // Ellipsis before last two pages
    if (currentPage < effectiveTotalPages - 2 && effectiveTotalPages > 5) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    // Last two pages
    if (effectiveTotalPages - 1 > 2) {
      items.push(
        <PaginationItem key={effectiveTotalPages - 1}>
          <PaginationLink
            onPress={() => setPage(effectiveTotalPages - 1)}
            isActive={currentPage === effectiveTotalPages - 1}
          >
            {effectiveTotalPages - 1}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (effectiveTotalPages >= 3) {
      items.push(
        <PaginationItem key={effectiveTotalPages}>
          <PaginationLink
            onPress={() => setPage(effectiveTotalPages)}
            isActive={currentPage === effectiveTotalPages}
          >
            {effectiveTotalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }
  }

  // Next button
  items.push(
    <PaginationItem key="next">
      <PaginationNext onPress={() => setPage(currentPage + 1)} isDisabled={!canGoNext} />
    </PaginationItem>,
  );

  return (
    <Pagination>
      <PaginationContent>{items}</PaginationContent>
    </Pagination>
  );
};
