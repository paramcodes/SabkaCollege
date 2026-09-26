import { Skeleton } from "@/src/components/ui/skeleton";

export default function LearningLoading() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="mt-5 h-12 w-2/3 max-w-2xl" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
      <p className="sr-only" role="status">Loading your course</p>
    </main>
  );
}
