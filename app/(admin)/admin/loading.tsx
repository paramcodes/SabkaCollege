import { Skeleton } from "@/src/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="grid gap-8">
      <div>
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-3 h-10 w-56" />
        <Skeleton className="mt-3 h-5 w-full max-w-md" />
      </div>
      <section aria-label="Loading admin metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </section>
      <Skeleton className="h-40 w-full" />
      <p className="sr-only" role="status">
        Loading admin workspace
      </p>
    </div>
  );
}
