import { CardSkeleton, ChartSkeleton, ListSkeleton, PageHeaderSkeleton } from "@/components/ui/loading";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <ChartSkeleton height={140} />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ChartSkeleton key={i} height={72} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ChartSkeleton height={264} />
        </div>
        <div className="lg:col-span-2">
          <ChartSkeleton height={264} />
        </div>
      </div>
      <ListSkeleton rows={6} />
    </div>
  );
}
