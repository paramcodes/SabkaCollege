import Link from "next/link";

import { Button } from "@/src/components/ui/button";

export function AdminPagination({
  page,
  hasNext,
  hasPrevious,
  basePath,
}: {
  page: number;
  hasNext: boolean;
  hasPrevious: boolean;
  basePath: string;
}) {
  if (!hasNext && !hasPrevious) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 border-t pt-4">
      {hasPrevious ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`${basePath}?page=${page - 1}`} aria-label="Previous page">Previous</Link>
        </Button>
      ) : <span />}
      <span className="text-sm text-muted-foreground">Page {page}</span>
      {hasNext ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`${basePath}?page=${page + 1}`} aria-label="Next page">Next</Link>
        </Button>
      ) : <span />}
    </nav>
  );
}
