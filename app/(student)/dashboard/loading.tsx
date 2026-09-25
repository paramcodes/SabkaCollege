import { Skeleton } from "@/src/components/ui/skeleton";

export default function StudentDashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
      <div className="max-w-3xl">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-4 h-12 w-3/4 max-w-xl" />
        <Skeleton className="mt-5 h-6 w-full max-w-2xl" />
      </div>
      <div className="mt-12 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="mt-16 h-8 w-52" />
      <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-80 w-full" />
        ))}
      </div>
      <p className="sr-only" role="status">
        Loading your dashboard
      </p>
    </div>
  );
}
