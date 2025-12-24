import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
  PaginationPreviousButton,
  PaginationButton,
  PaginationNextButton,
} from "@/components/ui/pagination";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
}

export const DynamicPagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  setPage,
}) => {
  const items = [];

  // Previous button
  items.push(
    <PaginationItem key="prev">
      <PaginationPreviousButton
        onClick={() => setPage(currentPage - 1)}
        disabled={currentPage === 1}
      />
    </PaginationItem>,
  );

  // First two pages
  if (totalPages >= 1) {
    items.push(
      <PaginationItem key={1}>
        <PaginationButton onClick={() => setPage(1)} isActive={currentPage === 1}>
          1
        </PaginationButton>
      </PaginationItem>,
    );
  }

  if (totalPages >= 2) {
    items.push(
      <PaginationItem key={2}>
        <PaginationButton onClick={() => setPage(2)} isActive={currentPage === 2}>
          2
        </PaginationButton>
      </PaginationItem>,
    );
  }

  // Ellipsis after first two pages
  if (currentPage > 3 && totalPages > 5) {
    items.push(
      <PaginationItem key="start-ellipsis">
        <PaginationEllipsis />
      </PaginationItem>,
    );
  }

  // Current page
  if (currentPage > 2 && currentPage < totalPages - 1) {
    items.push(
      <PaginationItem key={currentPage}>
        <PaginationButton onClick={() => setPage(currentPage)} isActive>
          {currentPage}
        </PaginationButton>
      </PaginationItem>,
    );
  }

  // Ellipsis before last two pages
  if (currentPage < totalPages - 2 && totalPages > 5) {
    items.push(
      <PaginationItem key="end-ellipsis">
        <PaginationEllipsis />
      </PaginationItem>,
    );
  }

  // Last two pages
  if (totalPages - 1 > 2) {
    items.push(
      <PaginationItem key={totalPages - 1}>
        <PaginationButton
          onClick={() => setPage(totalPages - 1)}
          isActive={currentPage === totalPages - 1}
        >
          {totalPages - 1}
        </PaginationButton>
      </PaginationItem>,
    );
  }

  if (totalPages >= 3) {
    items.push(
      <PaginationItem key={totalPages}>
        <PaginationButton onClick={() => setPage(totalPages)} isActive={currentPage === totalPages}>
          {totalPages}
        </PaginationButton>
      </PaginationItem>,
    );
  }

  // Next button
  items.push(
    <PaginationItem key="next">
      <PaginationNextButton
        onClick={() => setPage(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
    </PaginationItem>,
  );

  return (
    <Pagination>
      <PaginationContent>{items}</PaginationContent>
    </Pagination>
  );
};
