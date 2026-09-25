import { Skeleton } from "@/src/components/ui/skeleton";

export default function CourseOverviewLoading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-28">
      <Skeleton className="h-4 w-40" />
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-6 h-14 w-4/5 max-w-2xl" />
          <Skeleton className="mt-7 h-6 w-full max-w-xl" />
          <Skeleton className="mt-9 h-16 w-full" />
          <Skeleton className="mt-12 h-8 w-64" />
          <Skeleton className="mt-5 h-24 w-full max-w-3xl" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
      <p className="sr-only" role="status">
        Loading course
      </p>
    </div>
  );
}
