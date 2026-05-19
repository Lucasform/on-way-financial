import { ListSkeleton, PageHeaderSkeleton } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-12 rounded-lg" />
      <ListSkeleton rows={10} />
    </div>
  );
}
