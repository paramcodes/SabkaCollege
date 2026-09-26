import { Skeleton } from "@/src/components/ui/skeleton";

export default function CoursesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
      <div className="max-w-3xl">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-6 h-16 w-full max-w-xl" />
        <Skeleton className="mt-5 h-6 w-full max-w-2xl" />
      </div>
      <Skeleton className="mt-14 h-28 w-full" />
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="space-y-5 border border-foreground/15 p-6">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-9 w-4/5" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">
        Loading courses
      </p>
    </div>
  );
}
