import { Skeleton } from "@/src/components/ui/skeleton";

export default function LessonLoading() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-7 h-10 w-3/4 max-w-2xl" />
      <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="mt-6 h-9 w-40" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
      <p className="sr-only" role="status">
        Loading lesson
      </p>
    </main>
  );
}
